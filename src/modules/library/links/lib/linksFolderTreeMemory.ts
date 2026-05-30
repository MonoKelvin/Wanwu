const SELECTION_KEY = 'wanwu:links:folder-tree-selection'

function readJson(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(SELECTION_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, boolean>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function readLinksFolderTreeSelection(): Record<string, boolean> {
  return readJson()
}

export function writeLinksFolderTreeSelection(keys: Record<string, boolean>) {
  try {
    localStorage.setItem(SELECTION_KEY, JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}
