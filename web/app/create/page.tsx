"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useChannelCap } from "../../hooks/useChannelCap";
import { useWork } from "../../hooks/useWork";
import {
  createUploadFlow,
  encodeFlow,
  getRegisterTransaction,
  uploadFlow,
  getCertifyTransaction,
  getUploadResult,
  fetchBlobAsText,
  fetchBlobAsBytes,
  type UploadFlowState,
} from "../../lib/walrusQuilt";
import {
  sealEncrypt,
  sealDecrypt,
  localEncrypt,
  localDecrypt,
} from "../../lib/seal";
import { suiClient } from "../../lib/sui";
import "quill/dist/quill.snow.css";
import { buildPublishWorkTx, buildUpdateWorkTx } from "../../lib/contracts";
import { suiToMist } from "../../lib/units";

type GatingKey = "free" | "one" | "sub";
type ContentType = "article" | "images" | "video";

export default function CreatePage() {
  const account = useCurrentAccount();
  const search = useSearchParams();
  const workId = search?.get("workId") || undefined;
  const work = useWork(workId);
  const [contentType, setContentType] = useState<ContentType>("article");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("<p></p>");
  const [description, setDescription] = useState("");
  const [gating, setGating] = useState<GatingKey>("free");
  const [price, setPrice] = useState("2");
  const [cover, setCover] = useState("");
  const [manifestId, setManifestId] = useState("");
  const [blobIds, setBlobIds] = useState<string[]>([]); // Store uploaded blob IDs
  const [mediaFiles, setMediaFiles] = useState<File[]>([]); // For preview only
  const [uploadFlowState, setUploadFlowState] =
    useState<UploadFlowState | null>(null); // Walrus upload flow state
  const editorRef = useRef<HTMLDivElement | null>(null);
  const quillInstance = useRef<any>(null);
  const { mutateAsync: signAndExecute, isPending } =
    useSignAndExecuteTransaction();
  const channelInfo = useChannelCap(
    process.env.NEXT_PUBLIC_PACKAGE_ID,
    account?.address
  );
  const router = useRouter();
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    if (!work.data || !account) return;

    const loadContent = async () => {
      const workData = work.data;
      if (!workData) return;

      let parsed: any = null;
      if (workData.manifest) {
        try {
          parsed = JSON.parse(workData.manifest);
        } catch {
          parsed = null;
        }
      }

      setTitle(parsed?.title || "Untitled");
      setDescription(parsed?.description || "");
      setGating(workData.gating);
      setPrice(String(workData.price / 1e9));
      setCover(workData.coverUrl || "");
      if (parsed?.type) setContentType(parsed.type);
      if (parsed?.walrusBlobId) setManifestId(parsed.walrusBlobId);

      // Load content from Walrus
      if (parsed?.walrusBlobId) {
        try {
          setUploadingMedia(true);
          console.log("[Edit Debug] Loading content for editing...");
          console.log(
            "[Edit Debug] Parsed manifest:",
            JSON.stringify(parsed, null, 2)
          );
          console.log(
            "[Edit Debug] Encrypted:",
            parsed.encrypted,
            "Type:",
            typeof parsed.encrypted
          );
          console.log("[Edit Debug] Work gating:", workData.gating);

          // Handle legacy data: if encrypted field is missing, infer from gating
          const isEncrypted =
            parsed.encrypted === true ||
            (parsed.encrypted === undefined && workData.gating !== "free");
          console.log(
            "[Edit Debug] Is encrypted (after inference):",
            isEncrypted
          );

          if (isEncrypted) {
            // Encrypted content - decrypt based on encryption type
            console.log(
              "[Edit Debug] Content is encrypted, type:",
              parsed.encryptionType
            );
            const encryptedData = await fetchBlobAsBytes(parsed.walrusBlobId);

            if (parsed.encryptionType === "local" && parsed.encryptionKey) {
              // One-time content: Use local decryption
              const decryptedData = await localDecrypt(
                encryptedData,
                parsed.encryptionKey
              );
              const htmlContent = new TextDecoder().decode(decryptedData);
              setBody(htmlContent);
            } else if (parsed.encryptionType === "seal" && parsed.keyId) {
              // Subscription content: Creator can always edit their own content
              // First try using backup key (offline decryption for creators)
              if (parsed.backupKey) {
                try {
                  console.log(
                    "[Edit Debug] Creator editing: Using backup key for offline decryption"
                  );
                  // Import decryptWithBackupKey dynamically to avoid circular dependencies
                  const { decryptWithBackupKey } = await import(
                    "../../lib/seal"
                  );
                  const decryptedData = await decryptWithBackupKey(
                    encryptedData,
                    parsed.backupKey
                  );
                  const htmlContent = new TextDecoder().decode(decryptedData);
                  setBody(htmlContent);
                  console.log(
                    "[Edit Debug] Successfully decrypted with backup key"
                  );
                } catch (err: any) {
                  console.error(
                    "Failed to decrypt with backup key, trying Seal SDK:",
                    err
                  );
                  // Fallback: Try Seal SDK if backup key fails
                  await decryptWithSealSDK();
                }
              } else {
                // No backup key, use Seal SDK (requires subscription)
                console.log(
                  "[Edit Debug] No backup key, using Seal SDK decryption"
                );
                await decryptWithSealSDK();
              }

              async function decryptWithSealSDK() {
                const userSub = await (async () => {
                  if (!account?.address || !channelInfo.data?.channelId)
                    return null;
                  const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
                  if (!pkg) return null;
                  try {
                    const objects = await suiClient.getOwnedObjects({
                      owner: account.address,
                      filter: {
                        StructType: `${pkg}::subscription::ChannelSubscription`,
                      },
                      options: { showContent: true },
                    });
                    for (const obj of objects.data) {
                      const fields = (obj.data?.content as any)?.fields;
                      if (fields?.channel_id === channelInfo.data.channelId) {
                        const expiresAt = Number(fields.expires_at_ms || 0);
                        const isActive = expiresAt > Date.now();
                        if (isActive) {
                          return {
                            id: obj.data?.objectId as string,
                            channelId: fields.channel_id as string,
                          };
                        }
                      }
                    }
                  } catch (err) {
                    console.error("Failed to check subscription:", err);
                  }
                  return null;
                })();

                if (
                  userSub &&
                  channelInfo.data?.channelId &&
                  account?.address
                ) {
                  try {
                    console.log(
                      "[Edit Debug] Decrypting subscription content with Seal SDK"
                    );
                    const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
                    const decryptedData = await sealDecrypt(
                      {
                        encryptedData,
                        keyId: parsed.keyId,
                        subscriptionId: userSub.id,
                        channelId: userSub.channelId,
                        packageId,
                        userAddress: account.address,
                      },
                      suiClient
                    );
                    const htmlContent = new TextDecoder().decode(decryptedData);
                    setBody(htmlContent);
                  } catch (err: any) {
                    console.error(
                      "Failed to decrypt subscription content:",
                      err
                    );
                    setError("Failed to decrypt content: " + err.message);
                    setBody(
                      "<p>Unable to decrypt content. Please ensure you have an active subscription to this channel.</p>"
                    );
                  }
                } else {
                  setError(
                    "Cannot load subscription content for editing. Please ensure you have an active subscription to this channel or the backup key is available."
                  );
                  setBody(
                    "<p>Unable to load encrypted content. You need an active subscription or backup key to edit this content.</p>"
                  );
                }
              }
            } else {
              setError("Unknown encryption type or missing decryption data");
              setBody(parsed?.body || workData.manifest || "<p></p>");
            }
          } else {
            // Free content - fetch directly
            console.log("[Edit Debug] Loading as free content...");
            const htmlContent = await fetchBlobAsText(parsed.walrusBlobId);
            console.log(
              "[Edit Debug] Loaded content length:",
              htmlContent.length
            );
            console.log(
              "[Edit Debug] Content preview:",
              htmlContent.substring(0, 200)
            );
            setBody(htmlContent);
          }
        } catch (err: any) {
          console.error("Failed to load content from Walrus:", err);
          setError("Failed to load content: " + err.message);
          // Fallback to any body in manifest
          setBody(parsed?.body || workData.manifest || "<p></p>");
        } finally {
          setUploadingMedia(false);
        }
      } else {
        // No Walrus blob, use fallback
        setBody(parsed?.body || workData.manifest || "<p></p>");
      }
    };

    loadContent();
  }, [work.data, account]);

  // Clear related state when switching content type
  useEffect(() => {
    setManifestId("");
    setBlobIds([]);
    setMediaFiles([]);
    setUploadFlowState(null);
    setError(null);
  }, [contentType]);

  const canSubmit = !!account && !!channelInfo.data && title.trim().length > 2;

  // init quill with image upload handler
  useEffect(() => {
    if (contentType !== "article") return;
    if (quillInstance.current) return;
    let cancelled = false;
    import("quill").then(({ default: Quill }) => {
      if (cancelled || !editorRef.current) return;
      const q = new Quill(editorRef.current, {
        theme: "snow",
        modules: {
          toolbar: [
            [{ header: [1, 2, 3, false] }],
            ["bold", "italic", "underline", "strike"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link", "image", "video"],
            ["clean"],
          ],
        },
      });

      // // Custom image handler - prompt for URL
      // const toolbar = q.getModule("toolbar") as any;
      // toolbar.addHandler("image", () => {
      //   const url = prompt("Enter image URL:");
      //   if (url) {
      //     const range = q.getSelection(true);
      //     q.insertEmbed(range.index, "image", url, "user");
      //     q.setSelection(range.index + 1);
      //     setBody(q.root.innerHTML);
      //   }
      // });

      // // Custom video handler - prompt for URL
      // toolbar.addHandler("video", () => {
      //   const url = prompt("Enter video URL:");
      //   if (url) {
      //     const range = q.getSelection(true);
      //     q.insertEmbed(range.index, "video", url, "user");
      //     q.setSelection(range.index + 1);
      //     setBody(q.root.innerHTML);
      //   }
      // });

      q.root.innerHTML = body;
      q.on("text-change", () => setBody(q.root.innerHTML));
      quillInstance.current = q;
    });
    return () => {
      cancelled = true;
    };
  }, [contentType, body]);

  // Handle media upload for Images/Video mode
  const handleMediaUpload = async (files: File[]) => {
    if (files.length === 0) return;
    setError(null);
    setUploadingMedia(true);

    try {
      // Images/Video mode: Create upload flow
      const flow = await createUploadFlow(files);
      setUploadFlowState(flow);
    } catch (err: any) {
      setError(err.message || "Upload failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Start encoding (Step 1)
  const handleStartEncoding = async () => {
    if (!uploadFlowState) return;
    setUploadingMedia(true);
    setError(null);
    try {
      const newState = await encodeFlow(uploadFlowState);
      setUploadFlowState(newState);
    } catch (err: any) {
      setError(err.message || "Encoding failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Register on-chain (Step 2 - requires wallet signature) and auto-upload to network
  const handleRegister = async () => {
    if (!uploadFlowState || !account) return;
    setUploadingMedia(true);
    setError(null);
    try {
      // Step 2a: Register blob (requires signature)
      const tx = getRegisterTransaction(uploadFlowState, account.address, {
        deletable: false,
        epochs: 5,
      });
      const result = await signAndExecute({ transaction: tx });

      // Step 2b: Upload to network (automatic, no signature required)
      const newState = await uploadFlow(uploadFlowState, result.digest);
      setUploadFlowState(newState);
    } catch (err: any) {
      setError(err.message || "Registration or upload failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Certify (Step 3 - requires wallet signature)
  const handleCertify = async () => {
    if (!uploadFlowState) return;
    setUploadingMedia(true);
    setError(null);
    try {
      const tx = getCertifyTransaction(uploadFlowState);
      await signAndExecute({ transaction: tx });

      // Get final result
      const results = await getUploadResult(uploadFlowState);
      const firstResult = results[0];
      if (firstResult) {
        setManifestId(firstResult.blobId);
        setBlobIds([firstResult.blobId]);
        if (!cover && contentType !== "article") {
          setCover(firstResult.url);
        }
      }

      setUploadFlowState({ ...uploadFlowState, step: "complete" });
    } catch (err: any) {
      setError(err.message || "Certification failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Article mode: Prepare content for upload
  const handlePrepareArticle = async () => {
    if (!body || body === "<p></p>") {
      setError("Please write article content first");
      return;
    }
    if (!channelInfo.data) {
      setError("Channel info not loaded");
      return;
    }

    setUploadingMedia(true);
    setError(null);

    try {
      const htmlBytes = new TextEncoder().encode(body);
      let fileToUpload: File;

      // Check if content needs encryption (one-time or subscription)
      const needsEncryption = gating === "one" || gating === "sub";

      if (needsEncryption) {
        if (gating === "sub") {
          // Subscription content: Use Seal SDK encryption
          const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
          const tempWorkId = "temp-" + Date.now(); // Temporary, will be replaced after publishing

          const { encryptedData, keyId, backupKey } = await sealEncrypt(
            htmlBytes,
            packageId,
            channelInfo.data.channelId!,
            tempWorkId,
            suiClient
          );

          // Store Key ID for decryption
          const manifestWithSeal = {
            type: contentType,
            title,
            description,
            keyId, // Key ID for Seal Key Server
            backupKey, // Backup key for disaster recovery
            encrypted: true,
            encryptionType: "seal",
          };

          // Create file from encrypted data
          fileToUpload = new File(
            [encryptedData.buffer as ArrayBuffer],
            "content.enc",
            { type: "application/octet-stream" }
          );

          const uploadState = await createUploadFlow([fileToUpload]);
          setUploadFlowState({
            ...uploadState,
            manifest: {
              ...manifestWithSeal,
              gating: "sub", // Save gating type in manifest
            },
          });
        } else {
          // One-time content: Use local encryption
          const { encryptedData, key } = await localEncrypt(htmlBytes);

          // Store encryption key for later use
          const manifestWithLocal = {
            type: contentType,
            title,
            description,
            encryptionKey: key,
            encrypted: true,
            encryptionType: "local",
          };

          // Create file from encrypted data
          fileToUpload = new File(
            [encryptedData.buffer as ArrayBuffer],
            "content.enc",
            { type: "application/octet-stream" }
          );

          const uploadState = await createUploadFlow([fileToUpload]);
          setUploadFlowState({
            ...uploadState,
            manifest: {
              ...manifestWithLocal,
              gating: "one", // Save gating type in manifest
            },
          });
        }
      } else {
        // Free content - no encryption needed
        fileToUpload = new File([body], "article.html", { type: "text/html" });

        const uploadState = await createUploadFlow([fileToUpload]);
        setUploadFlowState({
          ...uploadState,
          manifest: {
            type: contentType,
            title,
            description,
            encrypted: false,
          },
        });
      }
    } catch (err: any) {
      setError(err.message || "Preparation failed");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSubmit = async () => {
    if (!channelInfo.data || !account) return;
    setError(null);
    setUploadingMedia(true);

    let finalManifestId = "";
    let finalBlobIds: string[] = [];

    try {
      if (contentType === "article") {
        // Article mode: Must complete upload flow first
        if (!uploadFlowState || uploadFlowState.step !== "complete") {
          setError("Please complete the article upload flow first");
          setUploadingMedia(false);
          return;
        }
        if (!manifestId || blobIds.length === 0) {
          setError("Upload flow incomplete, please retry");
          setUploadingMedia(false);
          return;
        }
        finalManifestId = manifestId;
        finalBlobIds = blobIds;
      } else {
        // Images/Video mode: Use already uploaded manifestId and blobIds
        if (!manifestId || blobIds.length === 0) {
          setError("Please complete the media upload flow first");
          setUploadingMedia(false);
          return;
        }
        finalManifestId = manifestId;
        finalBlobIds = blobIds;
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
      setUploadingMedia(false);
      return;
    }

    // Build manifest payload
    let manifestPayload: any = {
      type: contentType,
      title,
      description,
      walrusBlobId: finalManifestId,
      createdAt: Date.now(),
    };

    // Determine the actual gating type to use
    // If article was encrypted, use gating from uploadFlowState.manifest
    // Otherwise use current gating state
    let actualGating: GatingKey = gating;
    if (contentType === "article" && uploadFlowState?.manifest?.gating) {
      actualGating = uploadFlowState.manifest.gating as GatingKey;
      console.log("[Create Debug] Using gating from manifest:", actualGating);
    }

    // Merge manifest metadata from uploadFlowState (includes encrypted field for all content types)
    if (contentType === "article" && uploadFlowState?.manifest) {
      if (actualGating === "one" || actualGating === "sub") {
        // For encrypted content (one-time or subscription), include Seal manifest
        manifestPayload = {
          ...manifestPayload,
          encrypted: uploadFlowState.manifest.encrypted,
          encryptionType: uploadFlowState.manifest.encryptionType,
          ...(uploadFlowState.manifest.keyId && {
            keyId: uploadFlowState.manifest.keyId,
          }),
          ...(uploadFlowState.manifest.encryptionKey && {
            encryptionKey: uploadFlowState.manifest.encryptionKey,
          }),
          ...(uploadFlowState.manifest.backupKey && {
            backupKey: uploadFlowState.manifest.backupKey,
          }),
        };
      } else {
        // For free content, explicitly set encrypted: false
        manifestPayload = {
          ...manifestPayload,
          encrypted: false,
        };
      }
    }

    console.log("[Create Debug] Final manifest payload:", manifestPayload);
    console.log("[Create Debug] Using gating:", actualGating);
    console.log(
      "[Create Debug] Manifest JSON string:",
      JSON.stringify(manifestPayload, null, 2)
    );
    const manifestText = JSON.stringify(manifestPayload);

    const payload = {
      capId: channelInfo.data.capId!,
      channelId: channelInfo.data.channelId!,
      gating: actualGating, // Use the gating from encryption time
      price: actualGating === "one" ? suiToMist(price) : BigInt(0),
      manifest: manifestText,
      coverUrl: contentType === "article" ? "" : cover,
      mediaIds: finalBlobIds,
    };

    try {
      const tx = workId
        ? buildUpdateWorkTx({ ...payload, workId })
        : buildPublishWorkTx(payload);
      const res = await signAndExecute({ transaction: tx });
      setTxDigest(res.digest);
      setUploadingMedia(false);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to publish");
      setUploadingMedia(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)] bg-white/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            lovely
          </Link>
          <ConnectButton>
            {account
              ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
              : "Connect Wallet"}
          </ConnectButton>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="card grid gap-4">
          <h1 className="text-2xl font-bold">
            {workId ? "Edit post" : "Create post"}
          </h1>
          <div className="flex flex-wrap gap-2">
            {(["article", "images", "video"] as ContentType[]).map((ct) => (
              <button
                key={ct}
                className={contentType === ct ? "primary-btn" : "ghost-btn"}
                onClick={() => setContentType(ct)}
              >
                {ct === "article"
                  ? "Article"
                  : ct === "images"
                  ? "Image set"
                  : "Video set"}
              </button>
            ))}
          </div>

          <label className="space-y-1">
            <span className="text-sm text-[var(--muted)]">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
            />
          </label>

          {contentType !== "article" && (
            <label className="space-y-1">
              <span className="text-sm text-[var(--muted)]">Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
              />
            </label>
          )}

          {contentType !== "article" && (
            <label className="space-y-1">
              <span className="text-sm text-[var(--muted)]">
                Cover URL (optional)
              </span>
              <input
                value={cover}
                onChange={(e) => setCover(e.target.value)}
                className="w-full rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-sm"
              />
            </label>
          )}

          {contentType === "article" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm text-[var(--muted)]">Rich content</div>
                <div
                  ref={editorRef}
                  className="min-h-[260px] rounded-2xl border border-[var(--border)] bg-white px-4 py-3 text-[var(--text)] relative z-0"
                />
              </div>

              {/* Gating selection - moved here */}
              <div className="space-y-2">
                <div className="text-sm text-[var(--muted)]">
                  Access Control
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["free", "one", "sub"] as GatingKey[]).map((g) => (
                    <button
                      key={g}
                      className={gating === g ? "primary-btn" : "ghost-btn"}
                      onClick={() => setGating(g)}
                    >
                      {g === "free"
                        ? "Free"
                        : g === "one"
                        ? "One-time"
                        : "Subscription"}
                    </button>
                  ))}
                  {gating === "one" && (
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-32 rounded-xl border border-[var(--border)] bg-white px-3 py-2 text-sm"
                      placeholder="Price in SUI"
                    />
                  )}
                </div>
                {(gating === "one" || gating === "sub") && (
                  <div className="text-xs text-blue-600">
                    🔒 Content will be encrypted with Seal
                  </div>
                )}
              </div>

              {/* All upload steps in one place */}
              <div className="space-y-3">
                <div className="text-sm font-medium text-[var(--muted)]">
                  Upload Steps
                </div>

                <div className="flex flex-wrap gap-2">
                  {!uploadFlowState && (
                    <button
                      onClick={handlePrepareArticle}
                      disabled={uploadingMedia || !body || body === "<p></p>"}
                      className="primary-btn text-sm"
                    >
                      Prepare Upload{" "}
                      {(gating === "one" || gating === "sub") && "🔒"}
                    </button>
                  )}

                  {uploadFlowState?.step === "idle" && (
                    <button
                      onClick={handleStartEncoding}
                      disabled={uploadingMedia}
                      className="primary-btn text-sm"
                    >
                      1️⃣ Encode Data
                    </button>
                  )}

                  {uploadFlowState?.step === "ready" && (
                    <button
                      onClick={handleRegister}
                      disabled={uploadingMedia || !account}
                      className="primary-btn text-sm"
                    >
                      2️⃣ Register & Upload 🔐
                    </button>
                  )}

                  {uploadFlowState?.step === "uploading" && (
                    <button
                      onClick={handleCertify}
                      disabled={uploadingMedia}
                      className="primary-btn text-sm"
                    >
                      3️⃣ Certify Upload 🔐
                    </button>
                  )}

                  {uploadFlowState?.step === "complete" && (
                    <>
                      <div className="text-sm text-green-600 flex items-center gap-2">
                        ✅ Upload complete! BlobId: {manifestId.slice(0, 12)}...
                      </div>
                      <button
                        className="primary-btn text-sm"
                        disabled={!canSubmit || isPending}
                        onClick={handleSubmit}
                      >
                        {isPending ? "Publishing..." : "4️⃣ Publish to Chain 🔐"}
                      </button>
                    </>
                  )}
                </div>

                {uploadingMedia && (
                  <div className="text-xs text-blue-600">⏳ Processing...</div>
                )}

                {uploadFlowState && (
                  <div className="text-xs text-[var(--muted)]">
                    💡 Steps marked with 🔐 require wallet signature. Each step
                    is triggered by a separate button to avoid browser popup
                    blocking.
                  </div>
                )}

                {txDigest && (
                  <div className="text-xs text-green-600">
                    ✅ Published! Tx: {txDigest}
                  </div>
                )}

                {error && <div className="text-sm text-red-500">{error}</div>}
              </div>
            </div>
          )}

          {contentType !== "article" && (
            <div className="space-y-2">
              <label className="ghost-btn text-center">
                Select files
                <input
                  type="file"
                  multiple
                  accept={contentType === "images" ? "image/*" : "video/*"}
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files
                      ? Array.from(e.target.files)
                      : [];
                    setMediaFiles(files);
                    handleMediaUpload(files);
                  }}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {mediaFiles.map((f, idx) =>
                  contentType === "images" ? (
                    <img
                      key={idx}
                      src={URL.createObjectURL(f)}
                      alt={f.name}
                      className="h-24 w-24 rounded-xl border border-[var(--border)] object-cover"
                    />
                  ) : (
                    <video
                      key={idx}
                      src={URL.createObjectURL(f)}
                      className="h-24 w-40 rounded-xl border border-[var(--border)] object-cover"
                      controls
                    />
                  )
                )}
              </div>
            </div>
          )}

          {/* Images/Video mode only */}
          {contentType !== "article" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className="ghost-btn">
                  Select files to upload
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files
                        ? Array.from(e.target.files)
                        : [];
                      setMediaFiles(files);
                      handleMediaUpload(files);
                    }}
                  />
                </label>
                {uploadingMedia && (
                  <span className="text-xs text-[var(--muted)]">
                    Processing...
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
