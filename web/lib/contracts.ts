import { Transaction } from '@mysten/sui/transactions'
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client'

const CLOCK_ID = '0x6'
const pkg = process.env.NEXT_PUBLIC_PACKAGE_ID || ''
const REGISTRY_ID = process.env.NEXT_PUBLIC_CHANNEL_REGISTRY_ID || ''

function requirePackage() {
  if (!pkg) {
    throw new Error('NEXT_PUBLIC_PACKAGE_ID is not set')
  }
  return pkg
}

function requireRegistry() {
  if (!REGISTRY_ID) {
    throw new Error('NEXT_PUBLIC_CHANNEL_REGISTRY_ID is not set')
  }
  return REGISTRY_ID
}

function splitFromGas(tx: Transaction, amount: bigint) {
  return tx.splitCoins(tx.gas, [tx.pure.u64(amount)])
}

function gatingCall(tx: Transaction, gating: 'free' | 'one' | 'sub') {
  const target = gating === 'one' ? 'gating_one_time' : gating === 'sub' ? 'gating_subscription' : 'gating_free'
  return tx.moveCall({
    target: `${requirePackage()}::work::${target}`,
    arguments: [],
  })
}

export function buildCreateChannelTx(params: {
  name: string
  avatarUrl: string
  bio: string
  monthlyPrice: bigint
  yearlyPrice: bigint
  owner: string
}) {
  const tx = new Transaction()
  const cap = tx.moveCall({
    target: `${requirePackage()}::channel::create`,
    arguments: [
      tx.object(requireRegistry()),
      tx.pure.string(params.name),
      tx.pure.string(params.avatarUrl),
      tx.pure.string(params.bio),
      tx.pure.string(''),
      tx.pure.u64(params.monthlyPrice),
      tx.pure.u64(params.yearlyPrice),
    ],
  })
  tx.transferObjects([cap], tx.pure.address(params.owner))
  return tx
}

export function buildPublishWorkTx(params: {
  capId: string
  channelId: string
  gating: 'free' | 'one' | 'sub'
  price: bigint
  manifest: string
  coverUrl: string
  mediaIds?: string[]
}) {
  const tx = new Transaction()
  const gatingArg = gatingCall(tx, params.gating)
  // Currently we upload media via Walrus (off-chain), so no on-chain media object IDs.
  // Pass an empty vector<0x2::object::ID> placeholder. If we later have object IDs,
  // we need to convert them to TransactionArguments.
  const mediaArg = tx.makeMoveVec({ type: '0x2::object::ID', elements: [] })
  tx.moveCall({
    target: `${requirePackage()}::work::publish`,
    arguments: [
      tx.object(params.capId),
      tx.object(params.channelId),
      gatingArg,
      tx.pure.u64(params.price),
      tx.pure.string(params.manifest),
      tx.pure.string(params.coverUrl),
      mediaArg,
    ],
  })
  return tx
}

export function buildUpdateWorkTx(params: {
  capId: string
  channelId: string
  workId: string
  gating: 'free' | 'one' | 'sub'
  price: bigint
  manifest: string
  coverUrl: string
}) {
  const tx = new Transaction()
  const gatingNum = params.gating === 'one' ? 1 : params.gating === 'sub' ? 2 : 0
  tx.moveCall({
    target: `${requirePackage()}::work::update`,
    arguments: [
      tx.object(params.capId),
      tx.object(params.channelId),
      tx.object(params.workId),
      tx.pure.u8(gatingNum),
      tx.pure.u64(params.price),
      tx.pure.string(params.manifest),
      tx.pure.string(params.coverUrl),
    ],
  })
  return tx
}

export function buildDisableWorkTx(params: { capId: string; channelId: string; workId: string }) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${requirePackage()}::work::disable`,
    arguments: [tx.object(params.capId), tx.object(params.channelId), tx.object(params.workId)],
  })
  return tx
}

export function buildUnlockOnceTx(params: {
  workId: string
  channelId: string
  price: bigint
}) {
  const tx = new Transaction()
  const pay = splitFromGas(tx, params.price)
  tx.moveCall({
    target: `${requirePackage()}::work::unlock_once`,
    arguments: [tx.object(params.workId), tx.object(params.channelId), pay],
  })
  return tx
}

export function buildSubscribeTx(params: {
  channelId: string
  price: bigint
  plan: 1 | 2
}) {
  const tx = new Transaction()
  const pay = splitFromGas(tx, params.price)
  tx.moveCall({
    target: `${requirePackage()}::subscription::subscribe`,
    arguments: [tx.object(params.channelId), pay, tx.pure.u8(params.plan), tx.object(CLOCK_ID)],
  })
  return tx
}

export function buildSignTermsTx(termsText: string) {
  const tx = new Transaction()
  const bytes = Array.from(new TextEncoder().encode(termsText))
  tx.moveCall({
    target: `${requirePackage()}::terms::sign`,
    arguments: [tx.pure.vector('u8', bytes)],
  })
  return tx
}

export function buildFollowTx(params: { channelId: string }) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${requirePackage()}::channel::follow`,
    arguments: [tx.object(params.channelId)],
  })
  return tx
}

export function buildUnfollowTx(params: { channelId: string; ticketId: string }) {
  const tx = new Transaction()
  tx.moveCall({
    target: `${requirePackage()}::channel::unfollow`,
    arguments: [tx.object(params.channelId), tx.object(params.ticketId)],
  })
  return tx
}
