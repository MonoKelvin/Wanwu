export const MAX_RECENT_FONTS = 8
export const MAX_RECENT_COLORS = 12
export const MAX_RECENT_DIAGRAM_SHAPES = 10

const LEGACY_DIAGRAM_RECENT_SHAPES_KEY = 'wanwu.diagram.recentShapes'

export function normalizeRecentStringList(list: unknown, max: number): string[] {
  if (!Array.isArray(list)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    out.push(trimmed)
    if (out.length >= max) break
  }
  return out
}

export function bumpRecentString(list: string[], value: string, max: number): string[] {
  const trimmed = value.trim()
  if (!trimmed) return list
  return [trimmed, ...list.filter((item) => item !== trimmed)].slice(0, max)
}

export function readLegacyDiagramRecentShapes(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_DIAGRAM_RECENT_SHAPES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return normalizeRecentStringList(parsed, MAX_RECENT_DIAGRAM_SHAPES)
  } catch {
    return []
  }
}

export function clearLegacyDiagramRecentShapes(): void {
  try {
    localStorage.removeItem(LEGACY_DIAGRAM_RECENT_SHAPES_KEY)
  } catch {
    /* ignore */
  }
}
