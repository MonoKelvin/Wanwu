const STORAGE_KEY = 'wanwu.music.searchHistory'
const MAX_ITEMS = 40

export function normalizeMusicSearchTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ')
}

function termKey(term: string): string {
  return normalizeMusicSearchTerm(term).toLowerCase()
}

function readRaw(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is string => typeof x === 'string' && normalizeMusicSearchTerm(x).length > 0
    )
  } catch {
    return []
  }
}

function writeRaw(items: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function loadMusicSearchHistory(): string[] {
  return readRaw()
}

export function pushMusicSearchHistory(term: string): string[] {
  const normalized = normalizeMusicSearchTerm(term)
  if (!normalized) return readRaw()

  const key = termKey(normalized)
  const next = [normalized, ...readRaw().filter((item) => termKey(item) !== key)]
  writeRaw(next)
  return next
}

export function removeMusicSearchHistory(term: string): string[] {
  const key = termKey(term)
  const next = readRaw().filter((item) => termKey(item) !== key)
  writeRaw(next)
  return next
}

export function clearMusicSearchHistory(): string[] {
  writeRaw([])
  return []
}

export function filterMusicSearchHistory(items: string[], query: string): string[] {
  const q = termKey(query)
  if (!q) return [...items]
  return items.filter((item) => termKey(item).includes(q))
}
