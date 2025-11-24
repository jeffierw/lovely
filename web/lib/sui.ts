import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

export const suiClient = new SuiClient({
  url: process.env.NEXT_PUBLIC_SUI_GRPC || getFullnodeUrl('testnet'),
})
