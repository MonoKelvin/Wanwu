import type { QuickAccessHit, QuickAccessHitKind } from '@shared/types/quickAccess'

export const PALETTE_KIND_ORDER: QuickAccessHitKind[] = [
  'library',
  'note',
  'diagram',
  'link',
  'rss',
  'music',
  'favorite'
]

export const PALETTE_TOTAL_LIMIT = 24

function hitKey(hit: QuickAccessHit): string {
  return `${hit.kind}:${hit.id}`
}

/** 按类型顺序合并增量结果，去重并限制总数 */
export function mergePaletteHits(
  existing: QuickAccessHit[],
  incoming: QuickAccessHit[],
  limit = PALETTE_TOTAL_LIMIT
): QuickAccessHit[] {
  const map = new Map<string, QuickAccessHit>()
  for (const hit of existing) map.set(hitKey(hit), hit)
  for (const hit of incoming) map.set(hitKey(hit), hit)
  const merged = [...map.values()]
  merged.sort(
    (a, b) => PALETTE_KIND_ORDER.indexOf(a.kind) - PALETTE_KIND_ORDER.indexOf(b.kind)
  )
  return merged.slice(0, limit)
}
