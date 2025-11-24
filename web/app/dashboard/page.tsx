"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { useChannelCap } from "../../hooks/useChannelCap";
import { useChannel, useChannelWorks } from "../../hooks/useChannel";
import { buildDisableWorkTx } from "../../lib/contracts";

export default function DashboardPage() {
  const account = useCurrentAccount();
  const router = useRouter();
  const channelInfo = useChannelCap(
    process.env.NEXT_PUBLIC_PACKAGE_ID,
    account?.address
  );
  const channel = useChannel(channelInfo.data?.channelId);
  const works = useChannelWorks(channelInfo.data?.channelId);
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [deleting, setDeleting] = useState<string | null>(null);

  const go = (path: string) => router.push(path);

  // Auto-refresh works when coming back to this page
  useEffect(() => {
    if (channelInfo.data?.channelId) {
      works.refetch();
    }
  }, [channelInfo.data?.channelId, works]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="bg-transparent">
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

      <main className="mx-auto flex max-w-6xl gap-6 px-6 py-10">
        <div className="flex-1 space-y-6">
          <div className="card">
            <h2 className="section-title">Dashboard</h2>
            <p className="text-sm text-[var(--muted)]">
              {channelInfo.data
                ? `Channel ID: ${channelInfo.data.channelId}`
                : "Create your channel first."}
            </p>
            {channel.data && (
              <div className="mt-4 flex items-center gap-3">
                {channel.data.avatar && (
                  <img
                    src={channel.data.avatar}
                    alt={channel.data.name}
                    className="h-14 w-14 rounded-2xl object-cover"
                  />
                )}
                <div>
                  <div className="font-semibold">{channel.data.name}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {channel.data.bio}
                  </div>
                </div>
              </div>
            )}
            {!channelInfo.data && (
              <Link
                href="/channel/new"
                className="primary-btn mt-3 inline-block"
              >
                Create channel
              </Link>
            )}
          </div>

          <div className="card">
            <div className="flex items-center justify-between">
              <h2 className="section-title">My posts</h2>
              <button className="primary-btn" onClick={() => go("/create")}>
                Create new
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {(works.data ?? []).map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-3"
                >
                  <div>
                    <div className="font-semibold">{w.title}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {w.gating.toUpperCase()} · {w.price / 1e9} SUI
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="ghost-btn"
                      onClick={() => go(`/create?workId=${w.id}`)}
                    >
                      Edit
                    </button>
                    <button
                      className="ghost-btn"
                      disabled={deleting === w.id}
                      onClick={async () => {
                        if (!channelInfo.data) return;
                        setDeleting(w.id);
                        try {
                          await signAndExecute({
                            transaction: buildDisableWorkTx({
                              capId: channelInfo.data.capId!,
                              channelId: channelInfo.data.channelId!,
                              workId: w.id,
                            }),
                          });
                          works.refetch();
                        } finally {
                          setDeleting(null);
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              {(works.data ?? []).length === 0 && (
                <div className="text-[var(--muted)] text-sm">No posts yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
