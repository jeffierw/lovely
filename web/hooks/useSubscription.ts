import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../lib/sui";
import { isMockMode, getMockSubscription } from "../lib/mockData";

export type SubscriptionData = {
  id: string;
  channelId: string;
  subscriber: string;
  expiresAt: number;
  plan: number; // 1 = monthly, 2 = yearly
  isActive: boolean;
};

/**
 * Check if user has an active subscription to a specific channel
 */
export function useSubscription(userAddress?: string, channelId?: string) {
  return useQuery({
    enabled: !!userAddress && !!channelId,
    queryKey: ["subscription", userAddress, channelId],
    queryFn: async () => {
      if (!userAddress || !channelId) return null;

      // Mock mode
      if (isMockMode()) {
        return getMockSubscription(userAddress, channelId);
      }

      // Real blockchain query
      const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
      if (!pkg) return null;

      try {
        // Query user's owned subscription objects
        const objects = await suiClient.getOwnedObjects({
          owner: userAddress,
          filter: {
            StructType: `${pkg}::subscription::ChannelSubscription`,
          },
          options: {
            showContent: true,
          },
        });

        // Find subscription matching the channel
        for (const obj of objects.data) {
          const fields = (obj.data?.content as any)?.fields;
          if (fields?.channel_id === channelId) {
            const expiresAt = Number(fields.expires_at_ms || 0);
            const now = Date.now();
            const isActive = expiresAt > now;

            return {
              id: obj.data?.objectId as string,
              channelId: fields.channel_id as string,
              subscriber: fields.subscriber as string,
              expiresAt,
              plan: Number(fields.plan || 0),
              isActive,
            } as SubscriptionData;
          }
        }

        return null;
      } catch (err) {
        console.error("Failed to check subscription:", err);
        return null;
      }
    },
    staleTime: 30_000, // Cache for 30 seconds
    refetchInterval: 60_000, // Auto-refresh every minute
  });
}

/**
 * Get all subscriptions for a user
 */
export function useUserSubscriptions(userAddress?: string) {
  return useQuery({
    enabled: !!userAddress,
    queryKey: ["user-subscriptions", userAddress],
    queryFn: async () => {
      if (!userAddress) return [];

      // Mock mode
      if (isMockMode()) {
        const { getMockUserSubscriptions } = await import("../lib/mockData");
        return getMockUserSubscriptions(userAddress);
      }

      // Real blockchain query
      const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
      if (!pkg) return [];

      try {
        const objects = await suiClient.getOwnedObjects({
          owner: userAddress,
          filter: {
            StructType: `${pkg}::subscription::ChannelSubscription`,
          },
          options: {
            showContent: true,
          },
        });

        return objects.data
          .map((obj) => {
            const fields = (obj.data?.content as any)?.fields;
            if (!fields) return null;

            const expiresAt = Number(fields.expires_at_ms || 0);
            const now = Date.now();
            const isActive = expiresAt > now;

            return {
              id: obj.data?.objectId as string,
              channelId: fields.channel_id as string,
              subscriber: fields.subscriber as string,
              expiresAt,
              plan: Number(fields.plan || 0),
              isActive,
            } as SubscriptionData;
          })
          .filter((sub): sub is SubscriptionData => sub !== null);
      } catch (err) {
        console.error("Failed to fetch user subscriptions:", err);
        return [];
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
