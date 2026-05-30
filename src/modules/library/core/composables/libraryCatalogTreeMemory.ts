const HANDBOOK_SELECTION_KEY = 'wanwu:library:handbook-catalog-selection'

function readJson(key: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeJson(key: string, value: Record<string, boolean>) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore */
  }
}

export function readHandbookCatalogSelection(): Record<string, boolean> {
  return readJson(HANDBOOK_SELECTION_KEY)
}

export function writeHandbookCatalogSelection(keys: Record<string, boolean>) {
  writeJson(HANDBOOK_SELECTION_KEY, keys)
}
