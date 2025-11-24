"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useChannel, useChannelWorks } from "../../../hooks/useChannel";
import { useMyFollows } from "../../../hooks/useFollows";
import { buildFollowTx, buildUnfollowTx } from "../../../lib/contracts";
import { useMemo } from "react";

export default function ChannelPage() {
  const params = useParams();
  const id = params?.id as string;
  const account = useCurrentAccount();
  const { data: channel } = useChannel(id);
  const works = useChannelWorks(id);
  const follows = useMyFollows(
    process.env.NEXT_PUBLIC_PACKAGE_ID,
    account?.address
  );
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const isFollowing = useMemo(
    () => follows.data?.set.has(id),
    [follows.data, id]
  );

  const follow = async () => {
    await signAndExecute({ transaction: buildFollowTx({ channelId: id }) });
    follows.refetch();
  };
  const unfollow = async () => {
    const ticket = follows.data?.tickets.get(id);
    if (!ticket) return;
    await signAndExecute({
      transaction: buildUnfollowTx({ channelId: id, ticketId: ticket }),
    });
    follows.refetch();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold">
            lovely
          </Link>
          <ConnectButton>Connect Wallet</ConnectButton>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        <div className="card flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            {channel?.avatar && (
              <img
                src={channel.avatar}
                alt={channel.name}
                className="h-14 w-14 rounded-2xl object-cover"
              />
            )}
            <div>
              <div className="text-xl font-bold">
                {channel?.name || "Channel"}
              </div>
              <div className="text-sm text-[var(--muted)]">
                {channel?.followers ?? 0} followers
              </div>
              <div className="text-sm text-[var(--muted)]">{channel?.bio}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="primary-btn">
              {channel ? `${channel.monthly / 1e9} SUI / mo` : "Subscribe"}
            </button>
            {isFollowing ? (
              <button className="ghost-btn" onClick={unfollow}>
                Unfollow
              </button>
            ) : (
              <button className="ghost-btn" onClick={follow}>
                Follow
              </button>
            )}
            <button className="ghost-btn">Tip</button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {(works.data ?? []).map((w) => (
            <div key={w.id} className="card">
              <div className="text-xs text-[var(--muted)] mb-1">
                {(w.gating ?? 0) === 0
                  ? "FREE"
                  : (w.gating ?? 0) === 1
                  ? "ONE-TIME"
                  : "SUB"}
              </div>
              <div className="font-semibold">{w.title}</div>
              {(w.gating ?? 0) !== 0 && (
                <button className="ghost-btn mt-3">Unlock with Seal</button>
              )}
            </div>
          ))}
          {(works.data ?? []).length === 0 && (
            <div className="text-sm text-[var(--muted)]">No posts yet.</div>
          )}
        </div>

        <div>
          <Link href="/dashboard" className="ghost-btn">
            Back to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
