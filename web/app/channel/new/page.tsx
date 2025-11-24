'use client'

import { useState } from 'react'
import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { buildCreateChannelTx } from '../../../lib/contracts'
import { suiToMist } from '../../../lib/units'
import { uploadAvatarToWalrus } from '../../../lib/walrus'

export default function NewChannelPage() {
  const account = useCurrentAccount()
  const [name, setName] = useState('')
  const [monthly, setMonthly] = useState('1')   // SUI
  const [yearly, setYearly] = useState('10')    // SUI
  const [bio, setBio] = useState('')
  const [avatar, setAvatar] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [txDigest, setTxDigest] = useState<string | null>(null)
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const [error, setError] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const router = useRouter()
  const registryId = process.env.NEXT_PUBLIC_CHANNEL_REGISTRY_ID

  const canSubmit = !!account && name.trim().length > 2

  const handleCreate = async () => {
    if (!canSubmit) return
    setTxDigest(null)
    setError(null)
    if (!registryId) {
      setError('Channel registry is not configured')
      return
    }
    try {
      let avatarUrl = avatar
      if (avatarFile) {
        setUploadingAvatar(true)
        avatarUrl = await uploadAvatarToWalrus(avatarFile)
        setAvatar(avatarUrl)
      }
      const tx = buildCreateChannelTx({
        name,
        avatarUrl,
        bio,
        monthlyPrice: suiToMist(monthly),
        yearlyPrice: suiToMist(yearly),
        owner: account!.address,
      })
      const res = await signAndExecute({
        transaction: tx,
        options: { showEffects: true, showEvents: true },
      })
      setTxDigest(res.digest)
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to create channel')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="bg-transparent">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
          <div className="text-xl font-bold">Create channel</div>
          <div className="flex items-center gap-3">
            <Link href="/" className="ghost-btn">Feed</Link>
            <ConnectButton>
              {account ? `${account.address.slice(0,6)}...${account.address.slice(-4)}` : 'Connect'}
            </ConnectButton>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="card space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Create channel</h1>
            <p className="text-sm text-[var(--muted)]">Set pricing and profile; channel URL uses object ID.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-[var(--muted)]">Channel name</span>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
                placeholder="e.g. Neon Studio"
              />
              <div className="text-xs text-[var(--muted)]">Min 3 characters</div>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--muted)]">Avatar (Walrus upload)</span>
              <input
                type="file"
                accept="image/*"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) setAvatarFile(f)
                }}
                className="w-full rounded-xl border border-dashed border-[var(--border)] bg-black/20 px-4 py-3 text-sm"
              />
              {avatar && <img src={avatar} alt="Avatar preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-[var(--border)]" />}
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--muted)]">Monthly price (SUI)</span>
              <input
                value={monthly}
                onChange={e => setMonthly(e.target.value)}
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
              />
              <div className="text-xs text-[var(--muted)]">e.g. 1.5 SUI / month</div>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[var(--muted)]">Yearly price (SUI)</span>
              <input
                value={yearly}
                onChange={e => setYearly(e.target.value)}
                type="number"
                step="0.01"
                className="w-full rounded-xl border border-[var(--border)] bg-black/40 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
              />
              <div className="text-xs text-[var(--muted)]">e.g. 10 SUI / year</div>
            </label>
          </div>
          <label className="space-y-2">
            <span className="text-sm text-[var(--muted)]">Bio</span>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-[var(--border)] bg-black/30 px-4 py-3 text-sm focus:border-[var(--primary)] focus:outline-none"
              placeholder="Tell fans about your channel..."
            />
          </label>
          <div className="flex items-center gap-3 pt-4">
            <button className="primary-btn" disabled={!canSubmit || isPending || uploadingAvatar} onClick={handleCreate}>
              {uploadingAvatar ? 'Uploading avatar...' : isPending ? 'Submitting...' : canSubmit ? 'Create channel' : 'Connect wallet & fill name'}
            </button>
            {txDigest && <span className="text-xs text-[var(--muted)]">Tx: {txDigest}</span>}
          </div>
          {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
        </div>
      </div>
      {uploadingAvatar && (
        <div className="overlay">
          <div className="card text-center">
            <h3 className="text-lg font-semibold">Uploading avatar...</h3>
            <p className="text-sm text-[var(--muted)]">Please wait a few seconds.</p>
          </div>
        </div>
      )}
    </div>
  )
}
