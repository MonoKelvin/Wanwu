import type { LinkBookmark } from '@shared/types/links'

/** 列表展示排序（仅影响软件内 sort_order，写回浏览器需手动「同步到浏览器」） */
export type LinksSortMode = 'sync' | 'title' | 'time'

export const LINKS_SORT_STORAGE_KEY = 'wanwu:links:sortMode'

export const LINKS_SORT_OPTIONS: Array<{
  label: string
  value: LinksSortMode
  wwIcon: 'list' | 'arrow-down-a-z' | 'clock'
}> = [
  { label: '默认顺序', value: 'sync', wwIcon: 'list' },
  { label: '名称', value: 'title', wwIcon: 'arrow-down-a-z' },
  { label: '时间', value: 'time', wwIcon: 'clock' }
]

export function readLinksSortMode(): LinksSortMode {
  try {
    const v = localStorage.getItem(LINKS_SORT_STORAGE_KEY)
    if (v === 'sync' || v === 'title' || v === 'time') return v
  } catch {
    /* ignore */
  }
  return 'sync'
}

export function writeLinksSortMode(mode: LinksSortMode): void {
  try {
    localStorage.setItem(LINKS_SORT_STORAGE_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function sortBookmarksForDisplay(
  bookmarks: LinkBookmark[],
  mode: LinksSortMode
): LinkBookmark[] {
  const list = [...bookmarks]
  if (mode === 'title') {
    return list.sort((a, b) =>
      a.title.localeCompare(b.title, 'zh-CN', { sensitivity: 'base' })
    )
  }
  if (mode === 'time') {
    return list.sort((a, b) => b.sortOrder - a.sortOrder || a.id.localeCompare(b.id))
  }
  return list.sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
}
