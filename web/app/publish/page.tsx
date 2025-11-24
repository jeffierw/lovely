'use client'

import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit'
import Link from 'next/link'
import { buildPublishWorkTx } from '../../lib/contracts'
import { suiToMist } from '../../lib/units'
import { Transaction } from '@mysten/sui/transactions'
import { useChannelCap } from '../../hooks/useChannelCap'
import { uploadQuilt } from '../../lib/walrusQuilt'
import { useState } from 'react'

const gatingModes = [
  { key: 'free', label: 'Free', price: 0 },
  { key: 'one', label: 'One-time unlock (transferable NFT)', price: 2_000_000_000 },
  { key: 'sub', label: 'Channel subscription (monthly/yearly)', price: 0 },
]

export default function PublishPage() {
  const account = useCurrentAccount()
  const [title, setTitle] = useState('')
  const [gating, setGating] = useState('free')
  const [manifest, setManifest] = useState('')
  const [cover, setCover] = useState('')
  const [price, setPrice] = useState('2')
  const [contentType, setContentType] = useState<'article' | 'images' | 'video'>('article')
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [txDigest, setTxDigest] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { mutateAsync: signAndExecute, isPending } = useSignAndExecuteTransaction()
  const channelInfo = useChannelCap(process.env.NEXT_PUBLIC_PACKAGE_ID, account?.address)

  const canSubmit = !!account && title.trim().length > 2
  const noChannel = !channelInfo.data

  const runTx = async (txBuilder: () => Transaction) => {
    setTxDigest(null)
    setError(null)
    const tx = txBuilder()
    const res = await signAndExecute({
      transaction: tx,
      options: { showEffects: true, showEvents: true },
    })
    setTxDigest(res.digest)
  }

  const handlePublish = async () => {
    const channelId = channelInfo.data?.channelId
    const capId = channelInfo.data?.capId
    if (!canSubmit || !channelId || !capId) {
      setError('You need a channel before publishing.')
      return
    }
    let manifestText = manifest
    // Upload bundle via Walrus Quilt when files are provided
    if (files.length > 0) {
      try {
        const result: any = await uploadQuilt(files)
        manifestText = result?.manifestId || manifestText
        if (!cover && files[0]) {
          setCover(`walrus://${result?.manifestId || files[0].name}`)
        }
      } catch (err: any) {
        setError(err.message || 'Upload failed')
        return
      }
    }
    await runTx(() =>
      buildPublishWorkTx({
        capId,
        channelId,
        gating: gating as 'free' | 'one' | 'sub',
        price: gating === 'one' ? suiToMist(price) : 0n,
        manifest: contentType === 'article' ? `${title}\n\n${body}\n\n${manifestText}` : manifestText,
        coverUrl: cover,
        mediaIds: [],
      }),
    ).catch((err: any) => {
      setError(err.message || 'Publish failed')
    })
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link href="/" className="ghost-btn">Back</Link>
        <ConnectButton>
          {account ? `${account.address.slice(0,6)}...${account.address.slice(-4)}` : 'Connect Wallet'}
        </ConnectButton>
      </header>

      <div className="card">
        <h1 className="section-title">Publish a work</h1>
        <p style={{ color: 'var(--muted)' }}>Choose type, attach files, publish. We will automatically store your media.</p>
        {noChannel && (
          <div className="card" style={{ borderColor: 'tomato', color: 'tomato', marginBottom: 12 }}>
            You need a channel before publishing. <Link href="/channel/new" className="ghost-btn" style={{ marginLeft: 8 }}>Create channel</Link>
          </div>
        )}
        <div className="grid" style={{ marginTop: 16, gridTemplateColumns: '1fr 1fr' }}>
          <label>Channel ID<input value={channelInfo.data?.channelId || ''} disabled placeholder="Auto-detected" style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} /></label>
          <label>Channel cap ID<input value={channelInfo.data?.capId || ''} disabled placeholder="Auto-detected" style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} /></label>
          <label>Title<input value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} /></label>
          <label>Cover URL<input value={cover} onChange={e => setCover(e.target.value)} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} /></label>
          <label>Content type
            <select value={contentType} onChange={e => setContentType(e.target.value as any)} style={{ width: '100%', marginTop: 6 }}>
              <option value="article">Article</option>
              <option value="images">Image set</option>
              <option value="video">Video</option>
            </select>
          </label>
          <label>Media files (Walrus Quilt)
            <input type="file" multiple onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])} style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} />
            <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Uploads happen automatically before publishing.</div>
          </label>
          {contentType === 'article' && (
            <label style={{ gridColumn: 'span 2' }}>Article text<textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write your story. You can still attach images or video above." style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} /></label>
          )}
          <label style={{ gridColumn: 'span 2' }}>Extra notes / manifest ID<textarea value={manifest} onChange={e => setManifest(e.target.value)} rows={3} placeholder="Optional: paste existing Walrus manifest ID or Seal content refs" style={{ width: '100%', padding: 10, marginTop: 6, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }} /></label>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {gatingModes.map(mode => (
            <button
              key={mode.key}
              onClick={() => setGating(mode.key)}
              className={gating === mode.key ? 'primary-btn' : 'ghost-btn'}
            >
              {mode.label}
            </button>
          ))}
          {gating === 'one' && (
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              style={{ padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)' }}
              placeholder="One-time price in SUI"
            />
          )}
        </div>

        <div style={{ marginTop: 18 }}>
          <button className="primary-btn" disabled={!canSubmit || isPending} onClick={handlePublish}>
            {isPending ? 'Submitting...' : canSubmit ? 'Publish' : 'Connect wallet & add title'}
          </button>
          {txDigest && <span style={{ color: 'var(--muted)', marginLeft: 12 }}>Last tx: {txDigest}</span>}
          {error && <div style={{ color: 'tomato', marginTop: 8 }}>{error}</div>}
        </div>
      </div>
    </div>
  )
}
