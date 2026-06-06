const STORAGE_KEY = 'wanwu.diagram.recentDismissed'

export function loadDismissedRecentIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const list = JSON.parse(raw) as string[]
    return new Set(Array.isArray(list) ? list : [])
  } catch {
    return new Set()
  }
}

export function dismissRecentFile(fileId: string): void {
  const set = loadDismissedRecentIds()
  set.add(fileId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
}

export function restoreRecentFile(fileId: string): void {
  const set = loadDismissedRecentIds()
  set.delete(fileId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)))
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatRelativeTime(iso: string, nowTs = Date.now()): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'
  const diff = Math.max(0, nowTs - then)
  if (diff < 30_000) return '刚刚'
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return '1 分钟内'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  const thenDate = new Date(then)
  const nowDate = new Date(nowTs)
  const dayDiff = Math.floor(
    (new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime() -
      new Date(thenDate.getFullYear(), thenDate.getMonth(), thenDate.getDate()).getTime()) /
      86_400_000
  )
  if (dayDiff <= 0) return `${hours} 小时前`
  if (dayDiff === 1) return '昨天'
  if (dayDiff === 2) return '前天'
  if (dayDiff < 7) return `${dayDiff} 天前`
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
