/**
 * Upload a single blob using the latest Walrus publisher API (PUT /v1/blobs).
 * Returns an aggregator-friendly URL if possible (https://.../v1/blobs/<id>), otherwise the blob id or a local blob URL.
 */
export async function uploadAvatarToWalrus(file: File): Promise<string> {
  const publisher = process.env.NEXT_PUBLIC_WALRUS_PUBLISHER_URL || 'https://publisher.walrus-testnet.walrus.space';
  const aggregator = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR_URL || 'https://aggregator.walrus-testnet.walrus.space';

  try {
    const target = publisher.endsWith('/') ? `${publisher}v1/blobs` : `${publisher}/v1/blobs`;
    const res = await fetch(target, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'Content-Length': `${file.size}`,
      },
      body: file,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Walrus upload failed: ${res.status} ${text}`);
    }
    const data = await res.json().catch(() => ({} as any));
    const blobId = (data as any)?.blob_id || (data as any)?.id;
    if (blobId) {
      // Prefer a fetchable URL so UI can render the avatar
      return `${aggregator.replace(/\/$/, '')}/v1/blobs/${blobId}`;
    }
    return URL.createObjectURL(file);
  } catch (err) {
    console.warn('Walrus upload error, falling back to blob URL', err);
    return URL.createObjectURL(file);
  }
}
