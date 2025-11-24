"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useWork } from "../../../hooks/useWork";
import { useChannel } from "../../../hooks/useChannel";
import { useAccessNFT } from "../../../hooks/useAccessNFT";
import { useSubscription } from "../../../hooks/useSubscription";
import { sealDecrypt, localDecrypt } from "../../../lib/seal";
import { suiClient } from "../../../lib/sui";
import { buildUnlockOnceTx, buildSubscribeTx } from "../../../lib/contracts";
import { useEffect, useState } from "react";
import { Lock } from "lucide-react";

export default function PostDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const account = useCurrentAccount();
  const work = useWork(id);
  const channel = useChannel(work.data?.channelId);
  const accessNFT = useAccessNFT(account?.address, id);
  const subscription = useSubscription(account?.address, work.data?.channelId);
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [bodyHtml, setBodyHtml] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedContentType, setLockedContentType] = useState<
    "subscription" | "one-time" | null
  >(null);
  const [walrusQuilt, setWalrusQuilt] = useState<any>(null);

  // Dynamically load Walrus Quilt to avoid WASM SSR issues
  useEffect(() => {
    import("../../../lib/walrusQuilt.client").then(({ loadWalrusQuilt }) => {
      loadWalrusQuilt().then(setWalrusQuilt);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!work.data || !walrusQuilt) return;

      // Reset state
      setError(null);
      setBodyHtml(null);
      setIsLocked(false);
      setLockedContentType(null);

      let parsed: any = null;
      try {
        parsed = work.data.manifest ? JSON.parse(work.data.manifest) : null;
        console.log(
          "[Post Debug] Parsed manifest:",
          JSON.stringify(parsed, null, 2)
        );
        console.log("[Post Debug] Gating:", work.data.gating);
      } catch (err) {
        console.error("[Post Debug] Failed to parse manifest:", err);
        setBodyHtml(work.data.manifest || "");
        return;
      }

      const blobId = parsed?.walrusBlobId || parsed?.manifestId;
      if (!blobId) {
        console.log("[Post Debug] No blobId, using fallback");
        setBodyHtml(parsed?.body || work.data.manifest || "");
        return;
      }

      // Handle content based on gating type
      if (work.data.gating === "sub") {
        // Subscription-gated content
        console.log(
          "[Post Debug] Subscription content, hasSubscription:",
          subscription.data?.isActive
        );
        const hasSubscription = subscription.data?.isActive === true;

        if (
          hasSubscription &&
          subscription.data &&
          account?.address &&
          parsed?.encrypted &&
          parsed?.keyId
        ) {
          // User has subscription - decrypt and show
          try {
            console.log("[Post Debug] User has subscription, decrypting...");
            const encryptedBytes = await walrusQuilt.fetchBlobAsBytes(blobId);
            const packageId = process.env.NEXT_PUBLIC_PACKAGE_ID || "";
            const decryptedBytes = await sealDecrypt(
              {
                encryptedData: encryptedBytes,
                keyId: parsed.keyId,
                subscriptionId: subscription.data.id,
                channelId: work.data.channelId,
                packageId,
                userAddress: account.address,
              },
              suiClient
            );
            const text = new TextDecoder().decode(decryptedBytes);
            setBodyHtml(text);
            setIsLocked(false);
            console.log(
              "[Post Debug] Successfully decrypted and displayed content"
            );
          } catch (err) {
            console.error(
              "[Post Debug] Failed to decrypt subscription content:",
              err
            );
            setError("Failed to decrypt content. Please check your subscription status.");
            setIsLocked(true);
            setLockedContentType("subscription");
            setBodyHtml(null); // Don't set any HTML, show lock screen
          }
        } else {
          // No subscription - show lock screen (no bodyHtml)
          console.log("[Post Debug] No subscription, showing lock screen");
          setIsLocked(true);
          setLockedContentType("subscription");
          setBodyHtml(null); // Keep bodyHtml as null to show lock screen
        }
      } else if (work.data.gating === "one") {
        // One-time paid content
        console.log(
          "[Post Debug] One-time paid content, hasAccessNFT:",
          !!accessNFT.data
        );
        const hasAccessNFT = accessNFT.data !== null;

        if (hasAccessNFT && parsed?.encrypted && parsed?.encryptionKey) {
          // User has access NFT - decrypt and show
          try {
            console.log("[Post Debug] User has access NFT, decrypting...");
            const encryptedBytes = await walrusQuilt.fetchBlobAsBytes(blobId);
            const decryptedBytes = await localDecrypt(
              encryptedBytes,
              parsed.encryptionKey
            );
            const text = new TextDecoder().decode(decryptedBytes);
            setBodyHtml(text);
            setIsLocked(false);
            console.log(
              "[Post Debug] Successfully decrypted and displayed content"
            );
          } catch (err) {
            console.error(
              "[Post Debug] Failed to decrypt one-time content:",
              err
            );
            setError("Failed to decrypt content");
            setIsLocked(true);
            setLockedContentType("one-time");
            setBodyHtml(null); // Don't set any HTML, show lock screen
          }
        } else {
          // No access NFT - show lock screen (no bodyHtml)
          console.log("[Post Debug] No access NFT, showing lock screen");
          setIsLocked(true);
          setLockedContentType("one-time");
          setBodyHtml(null); // Keep bodyHtml as null to show lock screen
        }
      } else {
        // Free content - no encryption
        console.log("[Post Debug] Loading free content");
        try {
          const text = await walrusQuilt.fetchBlobAsText(blobId);
          console.log("[Post Debug] Loaded free content, length:", text.length);
          setBodyHtml(text);
          setIsLocked(false);
        } catch (err) {
          console.error("[Post Debug] Failed to load free content:", err);
          setError("Failed to load content from Walrus");
          setBodyHtml(parsed?.body || "");
        }
      }
    };
    load();
  }, [work.data, accessNFT.data, subscription.data, account?.address, walrusQuilt]);

  const handleUnlock = async () => {
    if (!work.data || !account) return;

    setUnlocking(true);
    setError(null);

    try {
      let parsed: any = null;
      try {
        parsed = work.data.manifest ? JSON.parse(work.data.manifest) : null;
      } catch {
        throw new Error("Invalid manifest format");
      }

      // Purchase access for one-time content
      if (work.data.gating === "one") {
        await signAndExecute({
          transaction: buildUnlockOnceTx({
            workId: work.data.id,
            channelId: work.data.channelId,
            price: BigInt(work.data.price),
          }),
        });

        // Refresh access NFT after purchase
        await accessNFT.refetch();
      }

      // After purchase, decrypt and display content
      if (parsed.encrypted && parsed.encryptionKey && parsed.walrusBlobId) {
        const res = await walrusQuilt.fetchBlob(parsed.walrusBlobId);
        const encryptedBytes = new Uint8Array(await res.arrayBuffer());

        // Decrypt using local decryption
        const decryptedBytes = await localDecrypt(
          encryptedBytes,
          parsed.encryptionKey
        );
        const text = new TextDecoder().decode(decryptedBytes);

        setBodyHtml(text);
        setIsLocked(false);
        setLockedContentType(null);
      }
    } catch (err: any) {
      console.error("Failed to unlock:", err);
      setError(err.message || "Failed to unlock content");
    } finally {
      setUnlocking(false);
    }
  };

  const handleSubscribe = async (plan: 1 | 2) => {
    if (!work.data || !channel.data || !account) return;

    setSubscribing(true);
    setError(null);

    try {
      const price =
        plan === 1 ? BigInt(channel.data.monthly) : BigInt(channel.data.yearly);

      await signAndExecute({
        transaction: buildSubscribeTx({
          channelId: work.data.channelId,
          price,
          plan,
        }),
      });

      // Refresh subscription status after purchase
      await subscription.refetch();

      // Reload content after subscription
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      console.error("Failed to subscribe:", err);
      setError(err.message || "Failed to subscribe");
    } finally {
      setSubscribing(false);
    }
  };

  let content = null;
  if (work.isLoading) {
    content = <div className="card animate-pulse h-64" />;
  } else if (work.error || !work.data) {
    content = <div className="card text-red-500">Failed to load post.</div>;
  } else {
    let parsed: any = null;
    try {
      parsed = work.data.manifest ? JSON.parse(work.data.manifest) : null;
    } catch {
      parsed = null;
    }
    const title = parsed?.title || "Post";
    const description = parsed?.description || "";
    const createdAt = parsed?.createdAt
      ? new Date(parsed.createdAt).toLocaleString()
      : "";
    const priceInSui = work.data.price / 1e9;

    content = (
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
          {channel.data?.avatar && (
            <img
              src={channel.data.avatar}
              alt={channel.data.name}
              className="h-12 w-12 rounded-2xl object-cover"
            />
          )}
          <div>
            <div className="font-semibold">
              {channel.data?.name || "Channel"}
            </div>
            <div className="text-sm text-[var(--muted)]">
              {channel.data?.bio}
            </div>
          </div>
        </div>
        <div className="text-xs text-[var(--muted)]">{createdAt}</div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{title}</h1>
          {work.data.gating !== "free" && (
            <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-black">
              {work.data.gating === "sub"
                ? "🔒 SUBSCRIPTION"
                : `🔒 ${priceInSui} SUI`}
            </span>
          )}
        </div>
        {description && <p className="text-[var(--muted)]">{description}</p>}
        {work.data.coverUrl && (
          <img
            src={work.data.coverUrl}
            alt="cover"
            className="w-full rounded-2xl border border-[var(--border)]"
          />
        )}

        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Content display with optional lock overlay */}
        <div className="relative min-h-[300px]">
          {bodyHtml ? (
            <>
              {/* Content (blurred if locked) */}
              <div
                className={`prose max-w-none transition-all ${
                  isLocked ? "blur-md select-none" : ""
                }`}
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />

              {/* Lock overlay (only shown if locked) */}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-white/60 to-white/90 dark:from-gray-900/60 dark:to-gray-900/90 backdrop-blur-sm">
                  <div className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border-2 border-[var(--border)] text-center space-y-6">
                    <Lock className="w-20 h-20 mx-auto text-[var(--primary)] animate-pulse" />

                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {lockedContentType === "subscription"
                          ? "🔒 Subscription Content"
                          : "🔒 Premium Content"}
                      </h3>
                      <p className="text-[var(--muted)]">
                        {lockedContentType === "subscription"
                          ? `Subscribe to this channel to unlock exclusive content`
                          : `Pay ${priceInSui} SUI to unlock this content`}
                      </p>
                    </div>

                    {!account ? (
                      <div className="text-sm text-[var(--muted)] bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl">
                        Please connect your wallet to unlock content
                      </div>
                    ) : lockedContentType === "one-time" ? (
                      <button
                        className="primary-btn w-full text-lg py-3"
                        onClick={handleUnlock}
                        disabled={unlocking}
                      >
                        {unlocking
                          ? "🔓 Unlocking..."
                          : `🔓 Pay ${priceInSui} SUI to Unlock`}
                      </button>
                    ) : (
                      <div id="subscribe-section" className="space-y-4">
                        <p className="text-sm font-medium">Choose your plan:</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            className="primary-btn text-sm py-3"
                            onClick={() => handleSubscribe(1)}
                            disabled={subscribing}
                          >
                            {subscribing ? "⏳" : "📅"} Monthly
                            <br />
                            <span className="text-lg font-bold">
                              {channel.data
                                ? (channel.data.monthly / 1e9).toFixed(1)
                                : "..."}{" "}
                              SUI/mo
                            </span>
                          </button>
                          <button
                            className="primary-btn text-sm py-3"
                            onClick={() => handleSubscribe(2)}
                            disabled={subscribing}
                          >
                            {subscribing ? "⏳" : "🎯"} Yearly
                            <br />
                            <span className="text-lg font-bold">
                              {channel.data
                                ? (channel.data.yearly / 1e9).toFixed(1)
                                : "..."}{" "}
                              SUI/yr
                            </span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Fallback when bodyHtml is null - show lock screen instead of generic message */
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="max-w-md w-full mx-4 bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-2xl border-2 border-[var(--border)] text-center space-y-6">
                <Lock className="w-20 h-20 mx-auto text-[var(--primary)] animate-pulse" />

                <div>
                  <h3 className="text-2xl font-bold mb-2">
                    {work.data.gating === "sub"
                      ? "🔒 Subscription Content"
                      : work.data.gating === "one"
                      ? "🔒 Premium Content"
                      : "📄 Loading Content"}
                  </h3>
                  <p className="text-[var(--muted)]">
                    {work.data.gating === "sub"
                      ? `Subscribe to this channel to unlock exclusive content`
                      : work.data.gating === "one"
                      ? `Pay ${priceInSui} SUI to unlock this content`
                      : "Content is loading, please wait..."}
                  </p>
                </div>

                {work.data.gating !== "free" &&
                  (!account ? (
                    <div className="text-sm text-[var(--muted)] bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-2xl">
                      Please connect your wallet to unlock content
                    </div>
                  ) : work.data.gating === "one" ? (
                    <button
                      className="primary-btn w-full text-lg py-3"
                      onClick={handleUnlock}
                      disabled={unlocking}
                    >
                      {unlocking
                        ? "🔓 Unlocking..."
                        : `🔓 Pay ${priceInSui} SUI to Unlock`}
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm font-medium">Choose your plan:</p>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          className="primary-btn text-sm py-3"
                          onClick={() => handleSubscribe(1)}
                          disabled={subscribing || !channel.data}
                        >
                          {subscribing ? "⏳" : "📅"} Monthly
                          <br />
                          <span className="text-lg font-bold">
                            {channel.data
                              ? (channel.data.monthly / 1e9).toFixed(1)
                              : "..."}{" "}
                            SUI/mo
                          </span>
                        </button>
                        <button
                          className="primary-btn text-sm py-3"
                          onClick={() => handleSubscribe(2)}
                          disabled={subscribing || !channel.data}
                        >
                          {subscribing ? "⏳" : "🎯"} Yearly
                          <br />
                          <span className="text-lg font-bold">
                            {channel.data
                              ? (channel.data.yearly / 1e9).toFixed(1)
                              : "..."}{" "}
                            SUI/yr
                          </span>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="bg-transparent">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            lovely
          </Link>
          <ConnectButton />
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">{content}</main>
    </div>
  );
}
