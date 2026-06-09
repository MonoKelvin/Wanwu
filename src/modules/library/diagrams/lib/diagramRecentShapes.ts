const STORAGE_KEY = 'wanwu.diagram.recentShapes'
const MAX_RECENT = 10

export function loadRecentShapeIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as string[]
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function recordRecentShape(shapeId: string): void {
  const id = shapeId.trim()
  if (!id) return
  const next = [id, ...loadRecentShapeIds().filter((item) => item !== id)].slice(0, MAX_RECENT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
