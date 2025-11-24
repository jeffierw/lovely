"use client";

/**
 * Seal encryption/decryption utilities using official @mysten/seal SDK
 * Docs: https://seal-docs.wal.app/GettingStarted/
 *
 * Seal provides threshold-based encryption with programmable on-chain access control.
 * Supports subscription-based content access via seal_approve function.
 */

import { SealClient } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHEX, toHEX } from "@mysten/sui/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";

// Seal Key Server Object IDs for Testnet
// These are the on-chain Seal server objects
const SERVER_OBJECT_IDS = [
  "0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75",
  "0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8",
];

// Package version shared object ID (deployed with seal_access module)
const PACKAGE_VERSION_ID =
  process.env.NEXT_PUBLIC_PACKAGE_VERSION_ID ||
  "0x0000000000000000000000000000000000000000000000000000000000000000";

// Clock object ID (Sui system object)
const CLOCK_ID = "0x6";

export interface SealEncryptionResult {
  encryptedData: Uint8Array;
  keyId: string;
  backupKey?: string; // For disaster recovery
}

export interface SealDecryptionParams {
  encryptedData: Uint8Array;
  keyId: string;
  subscriptionId: string;
  channelId: string;
  packageId: string;
  userAddress: string;
}

/**
 * Initialize Seal client with Sui client
 */
function createSealClient(suiClient: SuiClient): SealClient {
  return new SealClient({
    suiClient,
    serverConfigs: SERVER_OBJECT_IDS.map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });
}

/**
 * Generate Key ID for Seal encryption
 * Format: [package_id][channel_id][work_id_hash]
 *
 * If workId is not a valid hex string (e.g., "temp-123"),
 * we hash it to create a valid hex representation
 */
function generateKeyId(
  packageId: string,
  channelId: string,
  workId: string
): Uint8Array {
  // Remove 0x prefix
  const cleanPackageId = packageId.replace(/^0x/, "");
  const cleanChannelId = channelId.replace(/^0x/, "");

  // Check if workId is a valid hex string
  let cleanWorkId = workId.replace(/^0x/, "");
  const isValidHex = /^[0-9a-fA-F]+$/.test(cleanWorkId);

  if (!isValidHex) {
    // If not valid hex (e.g., "temp-1234"), hash it to create valid hex
    console.log("[Seal] workId is not valid hex, hashing:", workId);
    const encoder = new TextEncoder();
    const data = encoder.encode(workId);

    // Simple hash: use first 32 bytes (64 hex chars) of the UTF-8 encoded string
    // For a proper hash, we'd use crypto.subtle.digest, but for temp IDs this is fine
    let hash = "";
    for (let i = 0; i < Math.min(data.length, 32); i++) {
      hash += data[i].toString(16).padStart(2, "0");
    }
    // Pad if necessary
    while (hash.length < 64) {
      hash += "0";
    }
    cleanWorkId = hash;
  }

  const keyIdHex = cleanPackageId + cleanChannelId + cleanWorkId;
  console.log(
    "[Seal] Generated keyId (hex):",
    keyIdHex.substring(0, 40) + "..."
  );
  return fromHEX(keyIdHex);
}

/**
 * Encrypt content using Seal SDK for subscription-based access
 *
 * @param content - The data to encrypt
 * @param packageId - Your package ID (for seal_approve)
 * @param channelId - Channel ID (subscription context)
 * @param workId - Work ID (content identifier)
 * @returns Encrypted data, key ID, and optional backup key
 */
export async function sealEncrypt(
  content: Uint8Array,
  packageId: string,
  channelId: string,
  workId: string,
  suiClient: SuiClient
): Promise<SealEncryptionResult> {
  const client = createSealClient(suiClient);

  // Generate key ID
  const keyId = generateKeyId(packageId, channelId, workId);

  try {
    // Encrypt using Seal SDK
    console.log("[Seal] Encrypting with:", {
      packageId: packageId.substring(0, 10) + "...",
      keyIdType: typeof keyId,
      keyIdLength: keyId.length,
      contentSize: content.length,
    });

    // According to EncryptOptions, packageId should be a string, not Uint8Array
    const cleanPackageId = packageId.replace(/^0x/, "");
    const keyIdHex = toHEX(keyId);

    console.log("[Seal] Calling encrypt with:", {
      packageId: cleanPackageId.substring(0, 20) + "...",
      id: keyIdHex.substring(0, 20) + "...",
      threshold: 2,
    });

    const result = await client.encrypt({
      threshold: 2, // 2 out of 2 servers required
      packageId: cleanPackageId, // Should be a hex string without 0x
      id: keyIdHex, // Should be a hex string without 0x
      data: content,
    });

    console.log("[Seal] Encryption result:", {
      hasEncryptedObject: !!result?.encryptedObject,
      hasKey: !!result?.key,
      resultKeys: result ? Object.keys(result) : [],
    });

    // Seal SDK 0.9.4 returns { encryptedObject, key }
    const encryptedData = result?.encryptedObject;
    const backupKey = result?.key;

    if (!encryptedData) {
      throw new Error("Encryption result missing encrypted data");
    }

    return {
      encryptedData: new Uint8Array(encryptedData),
      keyId: toHEX(keyId),
      backupKey: backupKey ? toHEX(new Uint8Array(backupKey)) : undefined,
    };
  } catch (error) {
    console.error("[Seal] Encryption error:", error);
    console.error("[Seal] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw new Error(`Failed to encrypt content with Seal: ${error}`);
  }
}

/**
 * Decrypt content using Seal SDK with subscription verification
 *
 * The Seal Key Server will call your seal_approve function to verify access.
 *
 * @param params - Decryption parameters
 * @param suiClient - Sui client instance for building transaction
 * @returns Decrypted content
 */
export async function sealDecrypt(
  params: SealDecryptionParams,
  suiClient: SuiClient
): Promise<Uint8Array> {
  const client = createSealClient(suiClient);
  const {
    encryptedData,
    keyId,
    subscriptionId,
    channelId,
    packageId,
    userAddress,
  } = params;

  try {
    console.log("[Seal] Decrypting with:", {
      keyId: keyId.substring(0, 20) + "...",
      subscriptionId: subscriptionId.substring(0, 20) + "...",
      channelId: channelId.substring(0, 20) + "...",
      userAddress: userAddress.substring(0, 20) + "...",
    });

    // Build transaction for seal_approve
    const tx = new Transaction();
    tx.setSender(userAddress);

    // Call seal_approve function
    tx.moveCall({
      target: `${packageId}::seal_access::seal_approve`,
      arguments: [
        tx.pure.vector("u8", fromHEX(keyId.replace(/^0x/, ""))), // key_id
        tx.object(PACKAGE_VERSION_ID), // pkg_version
        tx.object(subscriptionId), // subscription
        tx.pure.id(channelId), // channel_id
        tx.object(CLOCK_ID), // clock
      ],
    });

    // Build transaction bytes (transaction kind only)
    const txBytes = await tx.build({
      client: suiClient,
      onlyTransactionKind: true,
    });

    console.log("[Seal] Transaction built, calling decrypt...");

    // Decrypt using Seal SDK
    // The key servers will execute the transaction to verify access
    const decryptedBytes = await client.decrypt({
      data: encryptedData,
      sessionKey: userAddress as any, // User's address as session identifier
      txBytes: txBytes,
    });

    console.log("[Seal] Decryption successful, size:", decryptedBytes?.length);

    return decryptedBytes;
  } catch (error) {
    console.error("[Seal] Decryption error:", error);
    console.error("[Seal] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes("ENoAccess")) {
        throw new Error("Access denied: Subscription invalid or expired");
      }
      if (error.message.includes("EWrongVersion")) {
        throw new Error("Package version mismatch");
      }
    }

    throw new Error(`Failed to decrypt content with Seal: ${error}`);
  }
}

/**
 * Local encryption fallback for one-time paid content (without Seal)
 * Uses client-side AES-GCM encryption
 */
export async function localEncrypt(
  content: Uint8Array
): Promise<{ encryptedData: Uint8Array; key: string }> {
  // Generate encryption key
  const key = await crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );

  const exported = await crypto.subtle.exportKey("raw", key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Ensure content is proper ArrayBuffer
  const contentBuffer = content.buffer.slice(
    content.byteOffset,
    content.byteOffset + content.byteLength
  ) as ArrayBuffer;

  // Encrypt content
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    contentBuffer
  );

  // Prepend IV to encrypted data
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.length);

  return {
    encryptedData: result,
    key: keyBase64,
  };
}

/**
 * Local decryption fallback for one-time paid content
 */
export async function localDecrypt(
  encryptedData: Uint8Array,
  keyBase64: string
): Promise<Uint8Array> {
  // Import key
  const keyBuffer = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-GCM",
    false,
    ["decrypt"]
  );

  // Extract IV and data
  const iv = encryptedData.slice(0, 12);
  const data = encryptedData.slice(12);

  // Decrypt
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv.buffer),
    },
    key,
    new Uint8Array(data.buffer)
  );

  return new Uint8Array(decrypted);
}

/**
 * Decrypt using backup key (for creators editing their own content)
 * This avoids calling Seal Key Servers and reduces network overhead
 *
 * The backup key is the master encryption key returned by Seal SDK during encryption.
 * Creators can use this to decrypt their content offline without network calls.
 *
 * @param encryptedData - The encrypted content
 * @param backupKeyHex - The backup key in hex format (from encryption result)
 * @returns Decrypted content
 */
export async function decryptWithBackupKey(
  encryptedData: Uint8Array,
  backupKeyHex: string
): Promise<Uint8Array> {
  try {
    console.log("[Seal] Decrypting with backup key (offline mode)...");

    // The Seal SDK returns the backup key as a hex string
    // This is the actual encryption key, not derived
    const backupKeyBytes = fromHEX(backupKeyHex.replace(/^0x/, ""));

    // Seal uses AES-GCM with the first 32 bytes as the key
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      backupKeyBytes.slice(0, 32),
      "AES-GCM",
      false,
      ["decrypt"]
    );

    // Seal encrypted data format: [nonce (12 bytes)][ciphertext][auth tag (16 bytes)]
    // The nonce is the first 12 bytes
    const nonce = encryptedData.slice(0, 12);
    const ciphertext = encryptedData.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: nonce,
      },
      cryptoKey,
      ciphertext
    );

    console.log("[Seal] ✅ Successfully decrypted with backup key (offline)");
    return new Uint8Array(decrypted);
  } catch (error) {
    console.error("[Seal] ❌ Failed to decrypt with backup key:", error);
    throw new Error(
      `Backup key decryption failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Helper: Convert Uint8Array to Base64
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/**
 * Helper: Convert Base64 to Uint8Array
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
