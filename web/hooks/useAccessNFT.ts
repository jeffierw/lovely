import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../lib/sui";
import { isMockMode, getMockAccessNFT } from "../lib/mockData";

/**
 * Check if user owns an AccessNFT for a specific work
 */
export function useAccessNFT(userAddress?: string, workId?: string) {
  return useQuery({
    enabled: !!userAddress && !!workId,
    queryKey: ["access-nft", userAddress, workId],
    queryFn: async () => {
      if (!userAddress || !workId) return null;

      // Mock mode
      if (isMockMode()) {
        return getMockAccessNFT(userAddress, workId);
      }

      // Real blockchain query
      const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID;
      if (!pkg) return null;

      try {
        const objects = await suiClient.getOwnedObjects({
          owner: userAddress,
          filter: {
            StructType: `${pkg}::access_nft::AccessNft`,
          },
          options: {
            showContent: true,
          },
        });

        // Check if any AccessNFT matches the workId
        for (const obj of objects.data) {
          const fields = (obj.data?.content as any)?.fields;
          if (fields?.work_id === workId) {
            return {
              id: obj.data?.objectId as string,
              workId: fields.work_id as string,
              channelId: fields.channel_id as string,
              issuedAt: Number(fields.issued_at_ms || 0),
            };
          }
        }

        return null;
      } catch (err) {
        console.error("Failed to check AccessNFT:", err);
        return null;
      }
    },
    staleTime: 10_000,
  });
}
