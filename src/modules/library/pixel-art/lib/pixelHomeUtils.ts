import type { PixelFileMeta } from '@modules/library/pixel-art/domain/types'
import type { WwIconName } from '@shared/icons/registry'
import { PIXEL_WPP_FILE_EXTENSION } from '@modules/library/pixel-art/domain/meta'

export type PixelFileSortField = 'updatedAt' | 'createdAt' | 'title'

export const PIXEL_FILE_SORT_OPTIONS: ReadonlyArray<{
  label: string
  value: PixelFileSortField
  wwIcon: WwIconName
}> = [
  { label: '更新时间', value: 'updatedAt', wwIcon: 'clock' },
  { label: '创建时间', value: 'createdAt', wwIcon: 'calendar-plus' },
  { label: '文件名', value: 'title', wwIcon: 'arrow-down-a-z' }
]

export function pixelTitleBase(title: string): string {
  const trimmed = title.trim() || '未命名像素画'
  return trimmed.toLowerCase().endsWith(PIXEL_WPP_FILE_EXTENSION)
    ? trimmed.slice(0, -PIXEL_WPP_FILE_EXTENSION.length)
    : trimmed
}

export function normalizePixelTitleInput(input: string): string {
  return pixelTitleBase(input)
}

export function pixelFileNameMatchesQuery(title: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const base = pixelTitleBase(title).toLowerCase()
  return base.includes(q) || title.toLowerCase().includes(q)
}

export function formatPixelDimensions(file: Pick<PixelFileMeta, 'width' | 'height'>): string {
  return `${file.width}×${file.height}`
}

export function sortRecentPixelFiles(files: PixelFileMeta[]): PixelFileMeta[] {
  return [...files].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
}

export function sortFolderPixelFiles(
  files: PixelFileMeta[],
  field: PixelFileSortField
): PixelFileMeta[] {
  return [...files].sort((a, b) => {
    if (field === 'title') {
      return pixelTitleBase(a.title).localeCompare(pixelTitleBase(b.title), 'zh-CN', {
        sensitivity: 'base'
      })
    }
    const key = field === 'createdAt' ? 'createdAt' : 'updatedAt'
    return new Date(b[key]).getTime() - new Date(a[key]).getTime()
  })
}

export function sortRecyclePixelFiles(files: PixelFileMeta[]): PixelFileMeta[] {
  return [...files].sort((a, b) => {
    const aDel = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
    const bDel = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
    return bDel - aDel
  })
}

export function formatPixelListCountLabel(options: {
  total: number
  shown: number
  searching: boolean
  recycle?: boolean
}): string {
  const { total, shown, searching, recycle } = options
  if (!total) return ''
  const unit = recycle ? '个已删除像素画' : '个像素画'
  return searching && shown !== total ? `显示 ${shown} / 共 ${total} ${unit}` : `共 ${total} ${unit}`
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
