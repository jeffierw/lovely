import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../lib/sui";
import { isMockMode, mockChannels } from "../lib/mockData";

export type ChannelData = {
  id: string;
  owner: string;
  name: string;
  avatar: string;
  bio: string;
  monthly: number;
  yearly: number;
  followers: number;
};

export function useChannel(channelId?: string) {
  return useQuery({
    enabled: !!channelId,
    queryKey: ["channel", channelId],
    queryFn: async () => {
      if (!channelId) return null;

      // Mock mode
      if (isMockMode()) {
        const mockChannel = mockChannels[channelId];
        if (mockChannel) {
          return mockChannel as ChannelData;
        }
        // Return a default mock if not found
        return {
          id: channelId,
          owner:
            "0x0000000000000000000000000000000000000000000000000000000000000000",
          name: "0xpest Channel",
          avatar: "https://picsum.photos/seed/default/200/200",
          bio: "This is my channel for test",
          monthly: 5_000_000_000,
          yearly: 50_000_000_000,
          followers: 100,
        } as ChannelData;
      }

      // Real blockchain query
      const res = await suiClient.getObject({
        id: channelId,
        options: { showContent: true },
      });
      const fields = (res.data?.content as any)?.fields;
      if (!fields) return null;
      return {
        id: channelId,
        owner: fields.owner as string,
        name: fields.name as string,
        avatar: fields.avatar_url as string,
        bio: fields.bio as string,
        monthly: Number(fields.monthly_price || 0),
        yearly: Number(fields.yearly_price || 0),
        followers: Number(fields.follower_count || 0),
      } as ChannelData;
    },
    staleTime: 20_000,
  });
}

export function useChannelWorks(channelId?: string) {
  return useQuery({
    enabled: !!channelId,
    queryKey: ["channel-works", channelId],
    queryFn: async () => {
      if (!channelId) return [];

      // Real blockchain query
      const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
      if (!pkg) return [];

      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${pkg}::events::WorkPublished` },
        order: "Descending",
        limit: 50,
      });
      const workIds = events.data
        .map((ev) => (ev.parsedJson as any)?.work_id as string | undefined)
        .filter((id): id is string => !!id && id !== "");
      const uniqueIds = Array.from(new Set(workIds));

      if (uniqueIds.length === 0) {
        // If no real works, optionally add mock works in mock mode
        if (isMockMode()) {
          const { getMockWorksByChannel } = await import("../lib/mockData");
          const works = getMockWorksByChannel(channelId);
          return works.map((work) => {
            let title = "Untitled";
            let manifest: any = {};
            try {
              manifest = JSON.parse(work.manifest);
              title = manifest.title || "Untitled";
            } catch {
              title = work.manifest
                ? String(work.manifest).slice(0, 40)
                : "Untitled";
            }

            return {
              id: work.id,
              workId: work.id,
              channelId: work.channelId,
              gating: work.gating,
              price: work.price,
              title,
              coverUrl: work.coverUrl,
            };
          });
        }
        return [];
      }

      const objects = await suiClient.multiGetObjects({
        ids: uniqueIds,
        options: { showContent: true },
      });

      let realWorks = objects
        .map((obj) => {
          const fields = (obj.data?.content as any)?.fields;
          if (!fields) return null;
          const gatingVariant = fields.gating as any;
          let gating: "free" | "one" | "sub" = "free";
          if (gatingVariant?.OneTime !== undefined) gating = "one";
          else if (gatingVariant?.Subscription !== undefined) gating = "sub";

          // Parse manifest to extract title
          let title = "Untitled";
          try {
            const manifest = JSON.parse(fields.manifest as string);
            title = manifest.title || "Untitled";
          } catch {
            // Fallback to truncated manifest
            title = fields.manifest
              ? String(fields.manifest).slice(0, 40)
              : "Untitled";
          }

          return {
            id: obj.data?.objectId as string,
            workId: obj.data?.objectId as string,
            channelId: fields.channel_id as string,
            gating,
            price: Number(fields.price || 0),
            title,
            coverUrl: fields.cover_url as string,
          };
        })
        .filter((w): w is NonNullable<typeof w> => !!w)
        .filter((w) => w.channelId === channelId);

      // In mock mode, add mock works to supplement real works
      if (isMockMode() && realWorks.length < 3) {
        const { getMockWorksByChannel } = await import("../lib/mockData");
        const mockWorks = getMockWorksByChannel(channelId);
        const mockWorksFormatted = mockWorks.map((work) => {
          let title = "Untitled";
          let manifest: any = {};
          try {
            manifest = JSON.parse(work.manifest);
            title = manifest.title || "Untitled";
          } catch {
            title = work.manifest
              ? String(work.manifest).slice(0, 40)
              : "Untitled";
          }

          return {
            id: work.id,
            workId: work.id,
            channelId: work.channelId,
            gating: work.gating,
            price: work.price,
            title,
            coverUrl: work.coverUrl,
          };
        });
        realWorks = [...realWorks, ...mockWorksFormatted];
      }

      return realWorks;
    },
    staleTime: 5_000, // Reduce cache time to 5 seconds
    refetchInterval: 10_000, // Auto-refresh every 10 seconds
  });
}
