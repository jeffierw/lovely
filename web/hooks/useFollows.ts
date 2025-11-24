import { useQuery } from '@tanstack/react-query'
import { suiClient } from '../lib/sui'
import { isMockMode, getMockFollows } from '../lib/mockData'

export type FollowTicketInfo = {
  ticketId: string
  channelId: string
}

export function useMyFollows(packageId?: string, owner?: string | null) {
  return useQuery({
    enabled: !!packageId && !!owner,
    queryKey: ['my-follows', packageId, owner],
    queryFn: async () => {
      if (!packageId || !owner) return { set: new Set<string>(), tickets: new Map<string, string>() }
      
      // Always query real blockchain data for follow tickets
      // The tickets map is needed for unfollow transactions
      const res = await suiClient.getOwnedObjects({
        owner,
        filter: { StructType: `${packageId}::channel::FollowTicket` },
        options: { showContent: true },
      })
      const set = new Set<string>()
      const tickets = new Map<string, string>()
      res.data.forEach((obj) => {
        const channelId = (obj.data?.content as any)?.fields?.channel_id as string | undefined
        if (channelId && obj.data?.objectId) {
          set.add(channelId)
          tickets.set(channelId, obj.data.objectId)
        }
      })
      
      // In mock mode, add mock follows for display purposes
      // but keep real tickets for transactions
      if (isMockMode()) {
        const mockData = getMockFollows(owner)
        // Add mock channels to the set for UI display
        mockData.set.forEach(channelId => set.add(channelId))
        // Don't add mock ticket IDs - only real ones work for transactions
      }
      
      return { set, tickets }
    },
    staleTime: 20_000,
  })
}

export function useFollowStats(packageId?: string) {
  return useQuery({
    enabled: !!packageId,
    queryKey: ['follow-stats', packageId],
    queryFn: async () => {
      if (!packageId) return new Map<string, number>()
      
      // Mock mode
      if (isMockMode()) {
        const { getMockFollowStats } = await import('../lib/mockData')
        return getMockFollowStats()
      }
      
      // Real blockchain query
      const map = new Map<string, number>()
      // gather Followed events
      const followed = await suiClient.queryEvents({
        query: { MoveEventType: `${packageId}::events::Followed` },
        order: 'descending',
        limit: 200,
      })
      followed.data.forEach((ev) => {
        const ch = (ev.parsedJson as any)?.channel_id as string | undefined
        if (!ch) return
        map.set(ch, (map.get(ch) || 0) + 1)
      })
      const unfollowed = await suiClient.queryEvents({
        query: { MoveEventType: `${packageId}::events::Unfollowed` },
        order: 'descending',
        limit: 200,
      })
      unfollowed.data.forEach((ev) => {
        const ch = (ev.parsedJson as any)?.channel_id as string | undefined
        if (!ch) return
        map.set(ch, Math.max(0, (map.get(ch) || 0) - 1))
      })
      return map
    },
    staleTime: 30_000,
  })
}
