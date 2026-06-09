import type { DiagramFileMeta } from '@shared/types/diagrams'

const STORAGE_KEY = 'wanwu.diagram.recentDismissed'

export type DiagramFileSortField = 'updatedAt' | 'createdAt' | 'title'

/** 万物流程图对外文件扩展名（WFG 文档压缩包） */
export const DIAGRAM_WFG_EXT = '.wfg'

/** 去掉标题中已有的 .wfg 后缀，得到文档基础名 */
export function diagramTitleBase(title: string): string {
  const trimmed = title.trim() || '未命名流程图'
  return trimmed.toLowerCase().endsWith(DIAGRAM_WFG_EXT)
    ? trimmed.slice(0, -DIAGRAM_WFG_EXT.length)
    : trimmed
}

/** 列表/搜索匹配的物理文件名（含扩展名，仅内部逻辑使用） */
export function formatDiagramFileName(title: string): string {
  return `${diagramTitleBase(title)}${DIAGRAM_WFG_EXT}`
}

/** 用户输入（可含 .wfg）规范为存入数据库的标题 */
export function normalizeDiagramTitleInput(input: string): string {
  return diagramTitleBase(input)
}

export function diagramFileNameMatchesQuery(title: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const base = diagramTitleBase(title).toLowerCase()
  const fileName = formatDiagramFileName(title).toLowerCase()
  return base.includes(q) || fileName.includes(q)
}

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

export function sortRecentDiagramFiles(files: DiagramFileMeta[]): DiagramFileMeta[] {
  return [...files].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}

export function sortFolderDiagramFiles(
  files: DiagramFileMeta[],
  field: DiagramFileSortField
): DiagramFileMeta[] {
  return [...files].sort((a, b) => {
    if (field === 'title') {
      return diagramTitleBase(a.title).localeCompare(diagramTitleBase(b.title), 'zh-CN', {
        sensitivity: 'base'
      })
    }
    const key = field === 'createdAt' ? 'createdAt' : 'updatedAt'
    return new Date(b[key]).getTime() - new Date(a[key]).getTime()
  })
}

export function sortRecycleDiagramFiles(files: DiagramFileMeta[]): DiagramFileMeta[] {
  return [...files].sort((a, b) => {
    const aDel = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
    const bDel = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
    return bDel - aDel
  })
}

export function formatDiagramListCountLabel(options: {
  total: number
  shown: number
  searching: boolean
  recycle?: boolean
  folderCount?: number
  foldersShown?: number
}): string {
  const { total, shown, searching, recycle, folderCount = 0, foldersShown = folderCount } = options
  if (!folderCount && !total) return ''
  const parts: string[] = []
  if (folderCount > 0) {
    const folderUnit = `${folderCount} 个分组`
    parts.push(
      searching && foldersShown !== folderCount ?
        `显示 ${foldersShown} / 共 ${folderUnit}`
      : `共 ${folderUnit}`
    )
  }
  if (total > 0) {
    const unit = recycle ? '个已删除流程图' : '个流程图'
    parts.push(
      searching && shown !== total ? `显示 ${shown} / 共 ${total} ${unit}` : `共 ${total} ${unit}`
    )
  }
  return parts.join(' · ')
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
