"use client";

import { CopyIcon, Share2Icon, CoinsIcon } from "lucide-react";
import Link from "next/link";
import { useChannel } from "../../hooks/useChannel";

type Props = {
  channelAvatar?: string;
  channelName: string;
  channelId: string;
  workId?: string;
  authorAddress: string;
  title: string;
  description?: string;
  gating?: "free" | "paid" | "sub";
  publishedAt?: number;
  isFollowing: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
};

export function FeedCard({
  channelAvatar,
  channelName,
  channelId,
  workId,
  authorAddress,
  title,
  description,
  gating = "free",
  publishedAt,
  isFollowing,
  onFollow,
  onUnfollow,
}: Props) {
  const channel = useChannel(channelId);
  const avatar = channel.data?.avatar || channelAvatar;
  const name = channel.data?.name || channelName;
  const shortAddress = `${authorAddress.slice(0, 6)}...${authorAddress.slice(
    -4
  )}`;
  const isPaid = gating !== "free";
  const formattedDate = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/10"
            />
          ) : (
            <div className="h-12 w-12 rounded-2xl bg-white/10" />
          )}
          <div>
            <div className="text-lg font-semibold">{name}</div>
            <div className="text-xs text-[var(--muted)]">
              By {shortAddress}
              {formattedDate && <> · {formattedDate}</>}
            </div>
          </div>
        </div>
        <button
          className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${
            isFollowing
              ? "bg-[#f1ede5] text-[var(--text)]"
              : "bg-[var(--primary)] text-black"
          }`}
          onClick={isFollowing ? onUnfollow : onFollow}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/post/${workId ?? channelId}`}
            className="text-xl font-bold hover:underline flex-1"
          >
            {title}
          </Link>
          {isPaid && (
            <span className="rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-black">
              {gating === "sub" ? "🔒 SUB" : "🔒 PAID"}
            </span>
          )}
        </div>
        {description && (
          <p
            className={`text-sm text-white/70 ${
              isPaid ? "blur-sm select-none" : ""
            }`}
          >
            {description}
          </p>
        )}
      </div>
      <div className="mt-4 flex gap-3">
        <button
          className="icon-btn"
          title="Tip"
          onClick={() => alert("Tips coming soon")}
        >
          <CoinsIcon size={18} />
        </button>
        <button
          className="icon-btn"
          title="Copy link"
          onClick={() => {
            if (typeof window !== "undefined")
              navigator.clipboard.writeText(
                `${window.location.origin}/channel/${channelId}`
              );
          }}
        >
          <CopyIcon size={18} />
        </button>
        <button
          className="icon-btn"
          title="Share"
          onClick={() => alert("Share coming soon")}
        >
          <Share2Icon size={18} />
        </button>
      </div>
    </div>
  );
}
