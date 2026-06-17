import type { QuickAccessHit, QuickAccessHitKind } from '@shared/types/quickAccess'
import { collectQuickAccessKindOrder } from '@app/modules/quickAccessKindRegistry'

export const PALETTE_TOTAL_LIMIT = 24

function hitKey(hit: QuickAccessHit): string {
  return `${hit.kind}:${hit.id}`
}

const FALLBACK_KIND_ORDER: QuickAccessHitKind[] = [
  'library',
  'note',
  'diagram',
  'link',
  'rss',
  'music',
  'favorite'
]

export function getPaletteKindOrder(): QuickAccessHitKind[] {
  const registered = collectQuickAccessKindOrder()
  return (registered.length > 0 ? registered : [...FALLBACK_KIND_ORDER]) as QuickAccessHitKind[]
}

/** 按类型顺序合并增量结果，去重并限制总数 */
export function mergePaletteHits(
  existing: QuickAccessHit[],
  incoming: QuickAccessHit[],
  limit = PALETTE_TOTAL_LIMIT
): QuickAccessHit[] {
  const order = getPaletteKindOrder()
  const map = new Map<string, QuickAccessHit>()
  for (const hit of existing) map.set(hitKey(hit), hit)
  for (const hit of incoming) map.set(hitKey(hit), hit)
  const merged = [...map.values()]
  merged.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
  return merged.slice(0, limit)
}
