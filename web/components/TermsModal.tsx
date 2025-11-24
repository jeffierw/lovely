"use client";

import { useEffect, useState } from "react";
import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";

const TERMS_VERSION = "lovely-terms-v1";
const DOMAIN = "lovely.wal.app";

/**
 * Generate random nonce (UUID v4 format)
 */
function generateNonce(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate sign message (Inkray-like format)
 */
function generateSignMessage(): string {
  const nonce = generateNonce();
  const timestamp = new Date().toISOString();

  return `Welcome to Lovely!

Please sign this message to authenticate your wallet and access your account.

This signature proves you own this wallet without sharing your private keys.

Nonce: ${nonce}

Timestamp: ${timestamp}

Domain: ${DOMAIN}`;
}

export function TermsModal() {
  const account = useCurrentAccount();
  const [open, setOpen] = useState(false);
  const { mutateAsync: signPersonalMessage, isPending } =
    useSignPersonalMessage();

  useEffect(() => {
    if (!account) return;
    const key = `terms-${TERMS_VERSION}-${account.address}`;
    const accepted =
      typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (!accepted) setOpen(true);
  }, [account]);

  const handleAccept = async () => {
    if (!account) return;
    const key = `terms-${TERMS_VERSION}-${account.address}`;
    try {
      // Generate formatted sign message
      const signMessage = generateSignMessage();
      console.log("[Auth] Sign message:", signMessage);

      await signPersonalMessage({
        message: new TextEncoder().encode(signMessage),
      });
      localStorage.setItem(key, "accepted");
      setOpen(false);
    } catch (err) {
      console.error("Sign terms failed", err);
      alert("Signature declined");
    }
  };

  if (!open) return null;

  return (
    <div className="overlay" style={{ zIndex: 9998 }}>
      <div className="card" style={{ maxWidth: 640 }}>
        <h2 className="text-2xl font-bold mb-4">Welcome to Lovely! 🎉</h2>
        <p className="text-[var(--muted)] mb-4">
          Please sign this message to verify your wallet and access your
          account.
        </p>
        <p className="text-sm text-[var(--muted)] mb-6">
          This signature proves you own this wallet without sharing your private
          keys. Signing will not incur any fees or authorize any transactions.
        </p>
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 12,
            justifyContent: "center",
          }}
        >
          <button
            className="primary-btn"
            onClick={handleAccept}
            disabled={isPending}
          >
            {isPending ? "Signing..." : "I Agree and Sign"}
          </button>
          <button className="ghost-btn" onClick={() => setOpen(false)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
