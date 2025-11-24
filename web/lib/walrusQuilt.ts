"use client";

/**
 * Walrus upload helpers using WalrusClient with wallet flow.
 * Docs: https://sdk.mystenlabs.com/walrus
 * Example: https://github.com/MystenLabs/ts-sdks/blob/main/packages/walrus/examples/quilt/write-flow.ts
 */
import { WalrusClient, walrus, WalrusFile } from "@mysten/walrus";
import { SuiClient } from "@mysten/sui/client";
import type { Transaction } from "@mysten/sui/transactions";
import type { Signer } from "@mysten/sui/cryptography";

const WALRUS_AGGREGATOR =
  process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL ||
  "https://aggregator.walrus-testnet.walrus.space";
const WALRUS_PUBLISHER =
  process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL ||
  "https://publisher.walrus-testnet.walrus.space";

let cachedClient: WalrusClient | null = null;
let extendedSuiClient: any = null;

/**
 * Create extended SuiClient instance with Walrus (for reading Quilt)
 * Reference: https://github.com/MystenLabs/ts-sdks/blob/main/packages/walrus/examples/quilt/read-quilt.ts
 */
function getExtendedSuiClient() {
  if (!extendedSuiClient) {
    const suiClient = new SuiClient({
      url: "https://fullnode.testnet.sui.io:443",
    });
    // IMPORTANT: walrus() needs the network to be specified on the client options
    extendedSuiClient = (suiClient as any).$extend(
      walrus({ network: "testnet" })
    );
  }
  return extendedSuiClient;
}

/**
 * Create WalrusClient instance (for uploading)
 */
function getWalrusClient() {
  if (!cachedClient) {
    const suiClient = new SuiClient({
      url: "https://fullnode.testnet.sui.io:443",
    });

    cachedClient = new WalrusClient({
      suiClient: suiClient as any, // Type compatibility workaround, using any
      network: "testnet",
      storageNodeClientOptions: {
        timeout: 60_000,
      },
      uploadRelay: {
        host:
          process.env.NEXT_PUBLIC_WALRUS_RELAY_URL ||
          "https://walrus-testnet-relay.mystenlabs.com",
        sendTip: {
          max: 1_000,
        },
      },
    });
  }
  return cachedClient;
}

/**
 * Upload flow state
 */
export type UploadFlowState = {
  step:
    | "idle"
    | "encoding"
    | "ready"
    | "registering"
    | "uploading"
    | "certifying"
    | "complete";
  files: WalrusFile[];
  flow: any; // WriteFilesFlow type
  error?: string;
  manifest?: any; // Manifest metadata for encrypted content
};

/**
 * Create upload flow
 * Uses Walrus writeFilesFlow API, completing upload step by step to avoid browser blocking wallet popups
 */
export async function createUploadFlow(
  files: File[]
): Promise<UploadFlowState> {
  if (files.length === 0) {
    throw new Error("No files to upload");
  }

  const client = getWalrusClient();

  // Convert File to WalrusFile
  const walrusFiles = await Promise.all(
    files.map(async (file) => {
      const contents = new Uint8Array(await file.arrayBuffer());
      return WalrusFile.from({
        contents,
        identifier: file.name,
        tags: {
          contentType: file.type || "application/octet-stream",
        },
      });
    })
  );

  // Create upload flow
  const flow = client.writeFilesFlow({
    files: walrusFiles,
  });

  return {
    step: "idle",
    files: walrusFiles,
    flow,
  };
}

/**
 * Step 1: Encode data (no user interaction required)
 */
export async function encodeFlow(
  state: UploadFlowState
): Promise<UploadFlowState> {
  try {
    await state.flow.encode();
    return { ...state, step: "ready" };
  } catch (error: any) {
    return { ...state, step: "idle", error: error.message };
  }
}

/**
 * Step 2: Register on-chain (requires wallet signature)
 * Returns transaction that needs to be signed
 */
export function getRegisterTransaction(
  state: UploadFlowState,
  ownerAddress: string,
  options?: { deletable?: boolean; epochs?: number }
): Transaction {
  return state.flow.register({
    deletable: options?.deletable ?? false,
    epochs: options?.epochs ?? 5,
    owner: ownerAddress,
  });
}

/**
 * Step 3: Upload to storage nodes (no user interaction required)
 */
export async function uploadFlow(
  state: UploadFlowState,
  txDigest: string
): Promise<UploadFlowState> {
  try {
    await state.flow.upload({ digest: txDigest });
    return { ...state, step: "uploading" };
  } catch (error: any) {
    return { ...state, step: "ready", error: error.message };
  }
}

/**
 * Step 4: Certify (requires wallet signature)
 * Returns transaction that needs to be signed
 */
export function getCertifyTransaction(state: UploadFlowState): Transaction {
  return state.flow.certify();
}

/**
 * Step 5: Get final result
 */
export async function getUploadResult(state: UploadFlowState) {
  const result = await state.flow.listFiles();
  return result.map((file: any) => ({
    id: file.id,
    blobId: file.blobId,
    blobObject: file.blobObject,
    url: `${WALRUS_AGGREGATOR.replace(/\/$/, "")}/v1/${file.blobId}`,
  }));
}

/**
 * Simplified upload flow (using HTTP API, no wallet signature required)
 * Used for media insertion in Article mode
 */
export async function uploadSingleBlobSimple(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const epochs = 5;
  const response = await fetch(
    `${WALRUS_PUBLISHER}/v1/blobs?epochs=${epochs}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      body: bytes,
    }
  );

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  const blobId =
    result.newlyCreated?.blobObject?.blobId || result.alreadyCertified?.blobId;

  if (!blobId) {
    throw new Error("Failed to get blobId from response");
  }

  const url = `${WALRUS_AGGREGATOR.replace(/\/$/, "")}/v1/${blobId}`;
  return { blobId, url, name: file.name };
}

export async function fetchManifest(manifestId: string) {
  const res = await fetch(
    `${WALRUS_AGGREGATOR.replace(/\/$/, "")}/v1/quilts/${manifestId}`
  );
  if (!res.ok) throw new Error(`Failed to fetch manifest ${manifestId}`);
  return res.json();
}

export async function fetchBlob(blobId: string) {
  const res = await fetch(
    `${WALRUS_AGGREGATOR.replace(/\/$/, "")}/v1/blobs/${blobId}`
  );
  if (!res.ok) throw new Error(`Failed to fetch blob ${blobId}`);
  return res;
}

/**
 * Fetch and decode Quilt-encoded blob as text
 * Walrus writeFilesFlow uses Quilt encoding, so we need to decode it
 */
export async function fetchBlobAsText(blobId: string): Promise<string> {
  console.log("[Walrus DEBUG] fetchBlobAsText called with blobId:", blobId);
  try {
    // Use extended SuiClient with Walrus to read Quilt-encoded blobs
    // Reference: https://github.com/MystenLabs/ts-sdks/blob/main/packages/walrus/examples/quilt/read-quilt.ts
    console.log("[Walrus DEBUG] Getting extended client...");
    const client = getExtendedSuiClient();
    console.log("[Walrus DEBUG] Client obtained, calling getFiles...");
    const [file] = await client.walrus.getFiles({ ids: [blobId] });
    console.log("[Walrus DEBUG] File obtained, reading bytes...");

    // Get the file content as bytes
    const bytes = await file.bytes();
    console.log("[Walrus] ✅ Read file from Quilt, total bytes:", bytes.length);

    // Decode to text
    const text = new TextDecoder().decode(bytes);
    console.log("[Walrus] ✅ Decoded text preview:", text.substring(0, 100));
    return text;
  } catch (err) {
    console.error("[Walrus] ❌ Failed to read as Quilt file, error:", err);
    console.warn("[Walrus] Falling back to raw HTTP fetch...");
    // Fallback: direct HTTP fetch
    const res = await fetchBlob(blobId);
    const text = await res.text();
    console.log(
      "[Walrus] ⚠️ Fallback fetch completed, text length:",
      text.length
    );
    return text;
  }
}

/**
 * Fetch and decode Quilt-encoded blob as bytes
 * Returns the first file's bytes from the Quilt
 */
export async function fetchBlobAsBytes(blobId: string): Promise<Uint8Array> {
  try {
    // Use extended SuiClient with Walrus to read Quilt-encoded blobs
    // Reference: https://github.com/MystenLabs/ts-sdks/blob/main/packages/walrus/examples/quilt/read-quilt.ts
    const client = getExtendedSuiClient();
    const [file] = await client.walrus.getFiles({ ids: [blobId] });

    // Get the file content as bytes
    const bytes = await file.bytes();
    console.log("[Walrus] Read file from Quilt, total bytes:", bytes.length);

    return bytes;
  } catch (err) {
    console.warn(
      "[Walrus] Failed to read as Quilt file, trying raw fetch:",
      err
    );
    // Fallback: direct HTTP fetch
    const res = await fetchBlob(blobId);
    const arrayBuffer = await res.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
}
