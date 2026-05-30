const STORAGE_KEY = 'wanwu:library:tree-expanded'

export function loadTreeExpandedKeys(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function saveTreeExpandedKeys(keys: Record<string, boolean>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}

export function loadScopedExpandedKeys(scope: string): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(scope)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, boolean>
    }
  } catch {
    /* ignore */
  }
  return {}
}

export function saveScopedExpandedKeys(scope: string, keys: Record<string, boolean>): void {
  try {
    localStorage.setItem(scope, JSON.stringify(keys))
  } catch {
    /* ignore */
  }
}
