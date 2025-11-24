"use client";

import { HiClock, HiFire, HiUserGroup } from "react-icons/hi2";

type FeedType = "fresh" | "popular" | "my";

const options: {
  id: FeedType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "fresh",
    label: "Fresh",
    description: "Latest drops from everyone",
    icon: HiClock,
  },
  {
    id: "popular",
    label: "Popular",
    description: "Trending by engagement",
    icon: HiFire,
  },
  {
    id: "my",
    label: "My feed",
    description: "Creators you follow",
    icon: HiUserGroup,
  },
];

export function FeedSidebar({
  value,
  onChange,
}: {
  value: FeedType;
  onChange: (type: FeedType) => void;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--border)]/60 bg-white/80 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--muted)]">
        Feed
      </div>
      {options.map((opt) => (
        <button
          key={opt.id}
          onClick={() => onChange(opt.id)}
          className={`w-full px-4 py-3 text-left transition ${
            value === opt.id
              ? "bg-white/80 text-[var(--text)]"
              : "hover:bg-white/60 text-[var(--muted)]"
          }`}
        >
          <div className="flex items-center gap-3">
            <opt.icon
              className={`h-5 w-5 ${
                value === opt.id ? "text-[var(--text)]" : "text-[var(--muted)]"
              }`}
            />
            <div>
              <div className="font-semibold">{opt.label}</div>
              <div className="text-xs text-[var(--muted)]">
                {opt.description}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
