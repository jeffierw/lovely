export function suiToMist(input: string | number): bigint {
  const val = typeof input === 'number' ? input : parseFloat(input || '0')
  if (Number.isNaN(val) || val < 0) return 0n
  return BigInt(Math.round(val * 1e9))
}
