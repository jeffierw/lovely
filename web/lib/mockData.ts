/**
 * Mock data utilities and helpers
 * Used when NEXT_PUBLIC_USE_MOCK_DATA=true
 */

export const isMockMode = () => {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
}

// Generate consistent mock addresses
export const mockAddresses = {
  channel1: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  channel2: '0x2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  channel3: '0x3234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  channel4: '0x4234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  channel5: '0x5234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
  
  work1: '0xa111111111111111111111111111111111111111111111111111111111111111',
  work2: '0xa222222222222222222222222222222222222222222222222222222222222222',
  work3: '0xa333333333333333333333333333333333333333333333333333333333333333',
  work4: '0xa444444444444444444444444444444444444444444444444444444444444444',
  work5: '0xa555555555555555555555555555555555555555555555555555555555555555',
  work6: '0xa666666666666666666666666666666666666666666666666666666666666666',
  work7: '0xa777777777777777777777777777777777777777777777777777777777777777',
  work8: '0xa888888888888888888888888888888888888888888888888888888888888888',
  
  user1: '0xb111111111111111111111111111111111111111111111111111111111111111',
  user2: '0xb222222222222222222222222222222222222222222222222222222222222222',
  
  cap1: '0xc111111111111111111111111111111111111111111111111111111111111111',
  
  subscription1: '0xd111111111111111111111111111111111111111111111111111111111111111',
  subscription2: '0xd222222222222222222222222222222222222222222222222222222222222222',
  
  accessNft1: '0xe111111111111111111111111111111111111111111111111111111111111111',
  
  ticket1: '0xf111111111111111111111111111111111111111111111111111111111111111',
  ticket2: '0xf222222222222222222222222222222222222222222222222222222222222222',
}

// Mock channel data
export const mockChannels = {
  [mockAddresses.channel1]: {
    id: mockAddresses.channel1,
    owner: mockAddresses.user1,
    name: 'Crypto Adventures',
    avatar: 'https://picsum.photos/seed/channel1/200/200',
    bio: 'Exploring the world of Web3 and blockchain technology',
    monthly: 5_000_000_000, // 5 SUI
    yearly: 50_000_000_000, // 50 SUI
    followers: 1250,
  },
  [mockAddresses.channel2]: {
    id: mockAddresses.channel2,
    owner: mockAddresses.user2,
    name: 'Digital Art Gallery',
    avatar: 'https://picsum.photos/seed/channel2/200/200',
    bio: 'Showcasing stunning digital artwork and NFT collections',
    monthly: 3_000_000_000, // 3 SUI
    yearly: 30_000_000_000, // 30 SUI
    followers: 890,
  },
  [mockAddresses.channel3]: {
    id: mockAddresses.channel3,
    owner: mockAddresses.user1,
    name: 'DeFi Insights',
    avatar: 'https://picsum.photos/seed/channel3/200/200',
    bio: 'Deep dives into DeFi protocols and strategies',
    monthly: 10_000_000_000, // 10 SUI
    yearly: 100_000_000_000, // 100 SUI
    followers: 567,
  },
  [mockAddresses.channel4]: {
    id: mockAddresses.channel4,
    owner: mockAddresses.user2,
    name: 'NFT Marketplace News',
    avatar: 'https://picsum.photos/seed/channel4/200/200',
    bio: 'Latest news and trends in NFT marketplaces',
    monthly: 2_000_000_000, // 2 SUI
    yearly: 20_000_000_000, // 20 SUI
    followers: 423,
  },
  [mockAddresses.channel5]: {
    id: mockAddresses.channel5,
    owner: mockAddresses.user1,
    name: 'Gaming & Metaverse',
    avatar: 'https://picsum.photos/seed/channel5/200/200',
    bio: 'Gaming in the metaverse and play-to-earn opportunities',
    monthly: 4_000_000_000, // 4 SUI
    yearly: 40_000_000_000, // 40 SUI
    followers: 312,
  },
}

// Mock works data
export const mockWorks = {
  [mockAddresses.work1]: {
    id: mockAddresses.work1,
    channelId: mockAddresses.channel1,
    gating: 'free' as const,
    price: 0,
    manifest: JSON.stringify({
      title: 'Introduction to Sui Blockchain',
      description: 'A comprehensive guide to getting started with Sui',
      type: 'article',
    }),
    coverUrl: 'https://picsum.photos/seed/work1/400/300',
    mediaIds: [],
  },
  [mockAddresses.work2]: {
    id: mockAddresses.work2,
    channelId: mockAddresses.channel1,
    gating: 'one' as const,
    price: 2_000_000_000, // 2 SUI
    manifest: JSON.stringify({
      title: 'Advanced Smart Contract Patterns',
      description: 'Learn advanced patterns for building secure smart contracts',
      type: 'video',
    }),
    coverUrl: 'https://picsum.photos/seed/work2/400/300',
    mediaIds: [],
  },
  [mockAddresses.work3]: {
    id: mockAddresses.work3,
    channelId: mockAddresses.channel2,
    gating: 'sub' as const,
    price: 0,
    manifest: JSON.stringify({
      title: 'Exclusive NFT Collection Reveal',
      description: 'Members-only preview of upcoming NFT drop',
      type: 'images',
    }),
    coverUrl: 'https://picsum.photos/seed/work3/400/300',
    mediaIds: [],
  },
  [mockAddresses.work4]: {
    id: mockAddresses.work4,
    channelId: mockAddresses.channel2,
    gating: 'free' as const,
    price: 0,
    manifest: JSON.stringify({
      title: 'Digital Art Techniques Tutorial',
      description: 'Free tutorial on creating stunning digital art',
      type: 'video',
    }),
    coverUrl: 'https://picsum.photos/seed/work4/400/300',
    mediaIds: [],
  },
  [mockAddresses.work5]: {
    id: mockAddresses.work5,
    channelId: mockAddresses.channel3,
    gating: 'one' as const,
    price: 5_000_000_000, // 5 SUI
    manifest: JSON.stringify({
      title: 'DeFi Yield Farming Strategies 2024',
      description: 'Proven strategies for maximizing DeFi yields',
      type: 'article',
    }),
    coverUrl: 'https://picsum.photos/seed/work5/400/300',
    mediaIds: [],
  },
  [mockAddresses.work6]: {
    id: mockAddresses.work6,
    channelId: mockAddresses.channel3,
    gating: 'sub' as const,
    price: 0,
    manifest: JSON.stringify({
      title: 'Weekly DeFi Portfolio Review',
      description: 'Subscriber-only weekly portfolio analysis',
      type: 'article',
    }),
    coverUrl: 'https://picsum.photos/seed/work6/400/300',
    mediaIds: [],
  },
  [mockAddresses.work7]: {
    id: mockAddresses.work7,
    channelId: mockAddresses.channel4,
    gating: 'free' as const,
    price: 0,
    manifest: JSON.stringify({
      title: 'Top 10 NFT Sales This Week',
      description: 'Recap of the biggest NFT sales',
      type: 'article',
    }),
    coverUrl: 'https://picsum.photos/seed/work7/400/300',
    mediaIds: [],
  },
  [mockAddresses.work8]: {
    id: mockAddresses.work8,
    channelId: mockAddresses.channel5,
    gating: 'one' as const,
    price: 3_000_000_000, // 3 SUI
    manifest: JSON.stringify({
      title: 'Metaverse Land Investment Guide',
      description: 'Complete guide to investing in virtual real estate',
      type: 'video',
    }),
    coverUrl: 'https://picsum.photos/seed/work8/400/300',
    mediaIds: [],
  },
}

// Helper to get works by channel
export function getMockWorksByChannel(channelId: string) {
  return Object.values(mockWorks).filter(work => work.channelId === channelId)
}

// Helper to generate mock feed items
export function generateMockFeedItems() {
  return Object.values(mockWorks).map((work, idx) => {
    const channel = mockChannels[work.channelId]
    let manifest: any = {}
    try {
      manifest = JSON.parse(work.manifest)
    } catch {}
    
    return {
      id: `feed-${work.id}`,
      workId: work.id,
      channelId: work.channelId,
      author: channel?.name || 'Unknown Creator',
      title: manifest.title || 'Untitled',
      cover: work.coverUrl,
      description: manifest.description,
      type: manifest.type || 'article',
      gating: work.gating === 'one' ? 'paid' : work.gating,
      publishedAt: Date.now() - idx * 3600000, // Stagger by hours
    }
  })
}

// Mock follow data - user follows certain channels
export function getMockFollows(userAddress?: string) {
  if (!userAddress) return { set: new Set<string>(), tickets: new Map<string, string>() }
  
  // Simulate user following channels 1 and 2
  const set = new Set([mockAddresses.channel1, mockAddresses.channel2])
  const tickets = new Map([
    [mockAddresses.channel1, mockAddresses.ticket1],
    [mockAddresses.channel2, mockAddresses.ticket2],
  ])
  
  return { set, tickets }
}

// Mock follow stats
export function getMockFollowStats() {
  const map = new Map<string, number>()
  Object.entries(mockChannels).forEach(([id, channel]) => {
    map.set(id, channel.followers)
  })
  return map
}

// Mock subscriptions
export function getMockSubscription(userAddress?: string, channelId?: string) {
  if (!userAddress || !channelId) return null
  
  // Simulate user subscribed to channel1
  if (channelId === mockAddresses.channel1) {
    return {
      id: mockAddresses.subscription1,
      channelId: mockAddresses.channel1,
      subscriber: userAddress,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      plan: 1, // monthly
      isActive: true,
    }
  }
  
  return null
}

// Mock user subscriptions
export function getMockUserSubscriptions(userAddress?: string) {
  if (!userAddress) return []
  
  return [
    {
      id: mockAddresses.subscription1,
      channelId: mockAddresses.channel1,
      subscriber: userAddress,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
      plan: 1,
      isActive: true,
    },
    {
      id: mockAddresses.subscription2,
      channelId: mockAddresses.channel3,
      subscriber: userAddress,
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
      plan: 2, // yearly
      isActive: true,
    },
  ]
}

// Mock access NFT
export function getMockAccessNFT(userAddress?: string, workId?: string) {
  if (!userAddress || !workId) return null
  
  // Simulate user owns access to work2
  if (workId === mockAddresses.work2) {
    const work = mockWorks[workId]
    return {
      id: mockAddresses.accessNft1,
      workId: workId,
      channelId: work.channelId,
      issuedAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    }
  }
  
  return null
}

// Mock channel cap - user owns channel1
export function getMockChannelCap(userAddress?: string) {
  if (!userAddress) return null
  
  // Simulate user owns channel1
  return {
    capId: mockAddresses.cap1,
    channelId: mockAddresses.channel1,
  }
}

// Mock top influencers
export function getMockTopInfluencers() {
  return Object.entries(mockChannels)
    .map(([id, channel]) => ({
      channelId: id,
      name: channel.name,
      followers: channel.followers,
    }))
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 5)
}

