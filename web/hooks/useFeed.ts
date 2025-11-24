import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../lib/sui";
import { useFollowStats } from "./useFollows";
import { isMockMode, generateMockFeedItems, getMockTopInfluencers } from "../lib/mockData";

export type FeedItem = {
  id: string;
  workId?: string;
  channelId: string;
  author: string;
  title: string;
  cover?: string;
  description?: string;
  type: "article" | "video" | "images";
  gating: "free" | "paid" | "sub";
  publishedAt?: number;
};

function snippetFromHtml(html?: string, maxLen = 140) {
  if (!html) return "";
  const plain = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > maxLen ? plain.slice(0, maxLen) + "…" : plain;
}

async function fetchEvents(): Promise<FeedItem[]> {
  // Mock mode
  if (isMockMode()) {
    return generateMockFeedItems() as FeedItem[];
  }
  
  // Real blockchain query
  const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
  if (!pkg) return [];
  try {
    const res = await suiClient.queryEvents({
      query: { MoveEventType: `${pkg}::events::WorkPublished` },
      limit: 50,
      order: "descending",
    });
    const workIds = res.data
      .map(
        (ev) =>
          ((ev.parsedJson as any)?.work_id as string | undefined) || undefined
      )
      .filter((id): id is string => !!id);
    const workMap = new Map<string, any>();
    if (workIds.length > 0) {
      const objects = await suiClient.multiGetObjects({
        ids: workIds,
        options: { showContent: true },
      });
      objects.forEach((obj) => {
        const fields = (obj.data?.content as any)?.fields;
        if (!fields) return;
        workMap.set(obj.data!.objectId, fields);
      });
    }
    return res.data.map((ev, idx) => {
      const channelId = (ev.parsedJson as any)?.channel_id ?? "unknown";
      const workId = (ev.parsedJson as any)?.work_id as string | undefined;
      const workFields = (workId && workMap.get(workId)) || null;
      const manifestRaw = workFields?.manifest as string | undefined;
      let parsed: any = null;
      if (manifestRaw) {
        try {
          parsed = JSON.parse(manifestRaw);
        } catch {
          parsed = null;
        }
      }
      const title = parsed?.title || workFields?.manifest || "Work";
      return {
        id: ev.id.txDigest + ":" + idx,
        workId,
        channelId,
        author:
          (ev.parsedJson as any)?.author ?? workFields?.author ?? "creator",
        title,
        cover: workFields?.cover_url || parsed?.coverUrl,
        description:
          parsed?.description ||
          snippetFromHtml(parsed?.body || workFields?.manifest),
        type: (parsed?.type as "article" | "video" | "images") || "article",
        gating:
          ((ev.parsedJson as any)?.gating ?? 0) === 0
            ? "free"
            : (ev.parsedJson as any)?.gating === 2
            ? "sub"
            : "paid",
        publishedAt: ev.timestampMs ? Number(ev.timestampMs) : undefined,
      };
    });
  } catch (err) {
    console.warn("feed events fallback", err);
    return [];
  }
}

export function useFeed(
  category: "popular" | "latest" | "mine",
  myFollowed?: Set<string>
) {
  const stats = useFollowStats(process.env.NEXT_PUBLIC_PACKAGE_ID);
  return useQuery({
    queryKey: [
      "feed",
      category,
      myFollowed ? myFollowed.size : 0,
      stats.data?.size || 0,
    ],
    queryFn: async () => {
      const items = await fetchEvents();
      // Show all items (free and paid)
      if (category === "mine" && myFollowed && myFollowed.size > 0) {
        return items.filter((i) => myFollowed.has(i.channelId));
      }
      if (category === "popular" && stats.data) {
        const scored = items.map((i) => ({
          item: i,
          score: stats.data?.get(i.channelId) || 0,
        }));
        return scored.sort((a, b) => b.score - a.score).map((s) => s.item);
      }
      // latest
      return items.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));
    },
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export function useTopInfluencers() {
  return useQuery({
    queryKey: ["top-influencers"],
    queryFn: async () => {
      // Mock mode
      if (isMockMode()) {
        return getMockTopInfluencers();
      }
      
      // Real blockchain query
      const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
      if (!pkg) {
        return [];
      }
      const stats = await (async () => {
        const map = new Map<string, number>();
        const followed = await suiClient.queryEvents({
          query: { MoveEventType: `${pkg}::events::Followed` },
          order: "descending",
          limit: 300,
        });
        followed.data.forEach((ev) => {
          const ch = (ev.parsedJson as any)?.channel_id as string | undefined;
          if (!ch) return;
          map.set(ch, (map.get(ch) || 0) + 1);
        });
        const unfollowed = await suiClient.queryEvents({
          query: { MoveEventType: `${pkg}::events::Unfollowed` },
          order: "descending",
          limit: 300,
        });
        unfollowed.data.forEach((ev) => {
          const ch = (ev.parsedJson as any)?.channel_id as string | undefined;
          if (!ch) return;
          map.set(ch, Math.max(0, (map.get(ch) || 0) - 1));
        });
        return map;
      })();

      const entries = Array.from(stats.entries()).map(
        ([channelId, followers]) => ({
          channelId,
          name: channelId.slice(0, 8) + "...",
          followers,
        })
      );
      if (entries.length === 0) {
        return [];
      }
      return entries.sort((a, b) => b.followers - a.followers).slice(0, 5);
    },
  });
}
