const EXPANDED_KEY = 'wanwu:library:links-catalog-expanded'
const SELECTION_KEY = 'wanwu:library:links-catalog-selection'

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

export function readLinksCatalogExpanded(): Record<string, boolean> {
  return readJson(EXPANDED_KEY)
}

export function writeLinksCatalogExpanded(keys: Record<string, boolean>) {
  writeJson(EXPANDED_KEY, keys)
}

export function readLinksCatalogSelection(): Record<string, boolean> {
  return readJson(SELECTION_KEY)
}

export function writeLinksCatalogSelection(keys: Record<string, boolean>) {
  writeJson(SELECTION_KEY, keys)
}

/** 进入链接大分类时默认展开「链接」主节点 */
export function defaultLinksCatalogExpanded(): Record<string, boolean> {
  return { 'major:links': true }
}
