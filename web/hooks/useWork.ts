import { useQuery } from '@tanstack/react-query'
import { suiClient } from '../lib/sui'
import { isMockMode, mockWorks } from '../lib/mockData'

export type WorkData = {
  id: string
  channelId: string
  gating: 'free' | 'one' | 'sub'
  price: number
  manifest: string
  coverUrl: string
  mediaIds: string[]
}

export function useWork(workId?: string) {
  return useQuery({
    enabled: !!workId,
    queryKey: ['work', workId],
    queryFn: async () => {
      if (!workId) return null
      
      // Mock mode
      if (isMockMode()) {
        const mockWork = mockWorks[workId]
        if (mockWork) {
          return {
            id: mockWork.id,
            channelId: mockWork.channelId,
            gating: mockWork.gating,
            price: mockWork.price,
            manifest: mockWork.manifest,
            coverUrl: mockWork.coverUrl,
            mediaIds: mockWork.mediaIds,
          } as WorkData
        }
        // Return a default mock if not found
        return {
          id: workId,
          channelId: '0x0000000000000000000000000000000000000000000000000000000000000000',
          gating: 'free' as const,
          price: 0,
          manifest: JSON.stringify({ title: 'Mock Work', description: 'This is a mock work for testing' }),
          coverUrl: 'https://picsum.photos/seed/mockwork/400/300',
          mediaIds: [],
        } as WorkData
      }
      
      // Real blockchain query
      const res = await suiClient.getObject({
        id: workId,
        options: { showContent: true },
      })
      const fields = (res.data?.content as any)?.fields
      if (!fields) return null
      const gatingVariant = fields.gating as any
      let gating: 'free' | 'one' | 'sub' = 'free'
      if (gatingVariant?.OneTime !== undefined) gating = 'one'
      else if (gatingVariant?.Subscription !== undefined) gating = 'sub'
      return {
        id: workId,
        channelId: fields.channel_id as string,
        gating,
        price: Number(fields.price || 0),
        manifest: fields.manifest as string,
        coverUrl: fields.cover_url as string,
        mediaIds: (fields.media_ids as string[]) || [],
      } as WorkData
    },
    staleTime: 20_000,
  })
}
