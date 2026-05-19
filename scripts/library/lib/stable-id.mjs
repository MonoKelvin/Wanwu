import { createHash } from 'crypto'

const NAMESPACE = 'wanwu-library-item:v1'

/** 由 slug 生成稳定 UUID 形态 id（同一 slug 永远相同） */
export function stableItemId(slug) {
  const hex = createHash('sha256').update(`${NAMESPACE}:${slug}`).digest('hex')
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    '4' + hex.slice(13, 16),
    ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.slice(18, 20),
    hex.slice(20, 32)
  ].join('-')
}

export function isUuidLike(s) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s))
}

export function ensureItemId(raw, slug) {
  if (raw && isUuidLike(raw)) return raw
  if (!slug) throw new Error('条目缺少 slug，无法生成稳定 id')
  return stableItemId(slug)
}
