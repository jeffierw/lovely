"use client";

import Link from "next/link";
import {
  ConnectButton,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState } from "react";
import { IpGate } from "../components/IpGate";
import { TermsModal } from "../components/TermsModal";
import { useChannelCap } from "../hooks/useChannelCap";
import { useFeed, useTopInfluencers } from "../hooks/useFeed";
import { useMyFollows } from "../hooks/useFollows";
import { buildFollowTx, buildUnfollowTx } from "../lib/contracts";
import { FeedCard } from "../components/feed/FeedCard";
import { FeedSidebar } from "../components/feed/FeedSidebar";

export default function Home() {
  const account = useCurrentAccount();
  const channelCap = useChannelCap(
    process.env.NEXT_PUBLIC_PACKAGE_ID,
    account?.address
  );
  const [feedType, setFeedType] = useState<"fresh" | "popular" | "my">("fresh");
  const follows = useMyFollows(
    process.env.NEXT_PUBLIC_PACKAGE_ID,
    account?.address
  );
  const feed = useFeed(
    feedType === "fresh"
      ? "latest"
      : feedType === "popular"
      ? "popular"
      : "mine",
    follows.data?.set
  );
  const top = useTopInfluencers();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const handleFollow = async (channelId: string) => {
    if (!account) return;
    await signAndExecute({ transaction: buildFollowTx({ channelId }) });
    follows.refetch();
  };

  const handleUnfollow = async (channelId: string) => {
    if (!account) return;
    const ticketId = follows.data?.tickets.get(channelId);
    if (!ticketId) return;
    await signAndExecute({
      transaction: buildUnfollowTx({ channelId, ticketId }),
    });
    follows.refetch();
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <IpGate />
      <TermsModal />
      <div className="bg-transparent">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="text-xl font-bold tracking-tight">lovely</div>
          <div className="flex items-center gap-3">
            <Link
              href={channelCap.data ? "/dashboard" : "/channel/new"}
              className="ghost-btn"
            >
              {channelCap.data ? "Dashboard" : "Create channel"}
            </Link>
            <div className="px-3 py-1.5">
              <ConnectButton>
                {account
                  ? `${account.address.slice(0, 6)}...${account.address.slice(
                      -4
                    )}`
                  : "Connect Wallet"}
              </ConnectButton>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-6xl gap-6 px-4 py-8 overflow-x-hidden">
        <aside className="hidden w-56 flex-shrink-0 lg:block">
          <FeedSidebar value={feedType} onChange={setFeedType} />
        </aside>

        <section className="flex-1 min-w-0 space-y-4">
          {feed.isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="card animate-pulse space-y-4 bg-white/80"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 rounded bg-gray-200" />
                      <div className="h-3 w-20 rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className="h-4 w-48 rounded bg-gray-200" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="flex gap-3">
                    <div className="icon-btn bg-gray-200" />
                    <div className="icon-btn bg-gray-200" />
                    <div className="icon-btn bg-gray-200" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {!feed.isLoading &&
            (feed.data ?? []).map((item) => (
              <FeedCard
                key={item.id}
                channelAvatar={item.cover}
                channelName={item.author}
                channelId={item.channelId}
                workId={item.workId}
                authorAddress={item.author}
                title={item.title}
                description={item.description}
                gating={item.gating}
                publishedAt={item.publishedAt}
                isFollowing={!!follows.data?.set.has(item.channelId)}
                onFollow={() => handleFollow(item.channelId)}
                onUnfollow={() => handleUnfollow(item.channelId)}
              />
            ))}
          {!feed.isLoading && (feed.data?.length ?? 0) === 0 && (
            <div className="card text-center text-sm text-[var(--muted)]">
              No content yet. Create a channel and publish to see posts here.
            </div>
          )}
        </section>

        <aside className="hidden w-64 flex-shrink-0 space-y-4 lg:block">
          <div className="rounded-3xl border border-[var(--border)] bg-white/80 p-4">
            <div className="text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
              Top creators
            </div>
            <div className="mt-3 space-y-3">
              {(top.data ?? []).map((p) => (
                <div
                  key={p.channelId}
                  className="flex items-center justify-between rounded-xl border border-transparent px-2 py-2 hover:border-[var(--border)]"
                >
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {p.followers} followers
                    </div>
                  </div>
                  <Link
                    href={`/channel/${p.channelId}`}
                    className="ghost-btn text-xs"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
