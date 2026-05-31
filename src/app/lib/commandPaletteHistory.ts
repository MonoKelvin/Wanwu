const STORAGE_KEY = 'wanwu.commandPalette.history'
const MAX_ITEMS = 80

export function normalizePaletteTerm(term: string): string {
  return term.trim().replace(/\s+/g, ' ')
}

function termKey(term: string): string {
  return normalizePaletteTerm(term).toLowerCase()
}

function readRaw(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string' && normalizePaletteTerm(x).length > 0)
  } catch {
    return []
  }
}

function writeRaw(items: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

export function loadCommandPaletteHistory(): string[] {
  return readRaw()
}

export function pushCommandPaletteHistory(term: string): string[] {
  const normalized = normalizePaletteTerm(term)
  if (!normalized) return readRaw()

  const key = termKey(normalized)
  const next = [normalized, ...readRaw().filter((item) => termKey(item) !== key)]
  writeRaw(next)
  return next
}

export function removeCommandPaletteHistory(term: string): string[] {
  const key = termKey(term)
  const next = readRaw().filter((item) => termKey(item) !== key)
  writeRaw(next)
  return next
}

export function clearCommandPaletteHistory(): string[] {
  writeRaw([])
  return []
}

export function filterCommandPaletteHistory(items: string[], query: string): string[] {
  const q = termKey(query)
  if (!q) return [...items]
  return items.filter((item) => termKey(item).includes(q))
}
