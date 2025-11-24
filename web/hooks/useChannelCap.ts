import { useQuery } from '@tanstack/react-query'
import { suiClient } from '../lib/sui'

export function useChannelCap(packageId?: string, owner?: string | null) {
  return useQuery({
    enabled: !!packageId && !!owner,
    queryKey: ['channel-cap', packageId, owner],
    queryFn: async () => {
      if (!packageId || !owner) return null
      
      // Always query real blockchain data for ChannelCap
      // This is needed for contract interactions (publishing works, etc.)
      const res = await suiClient.getOwnedObjects({
        owner,
        filter: {
          StructType: `${packageId}::channel::ChannelCap`,
        },
        options: {
          showContent: true,
        },
      })
      if (res.data.length === 0) return null
      const cap = res.data[0]
      const channelId = (cap.data?.content as any)?.fields?.channel_id as string | undefined
      return {
        capId: cap.data?.objectId,
        channelId,
      }
    },
    staleTime: 30_000,
  })
}
