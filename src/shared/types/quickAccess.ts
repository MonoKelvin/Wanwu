/** 全局唤起器 / 托盘 / 剪贴板联想 共用 */

export type QuickAccessHitKind = 'library' | 'note' | 'link' | 'rss' | 'music' | 'favorite'

export interface QuickAccessHit {
  kind: QuickAccessHitKind
  id: string
  title: string
  subtitle: string | null
  /** 图鉴 / 收藏条目 */
  itemSource?: 'library' | 'rss'
  itemId?: string
  noteId?: string
  linkUrl?: string
  feedId?: string
  musicVideoId?: string
  musicArtist?: string
  musicCoverUrl?: string
  musicProvider?: string
  musicTrackKey?: string
  musicPayloadJson?: string
}

export interface DailyPickPreview {
  id: string
  name: string
  summary: string | null
  categoryId: string
  categoryName: string
  coverPath: string | null
}

export interface QuickAccessTrayStatus {
  daily: DailyPickPreview | null
  rssEntryCount: number
  rssFeedCount: number
}

export interface QuickAccessOpenTarget {
  kind: QuickAccessHitKind
  id: string
  itemSource?: 'library' | 'rss'
  itemId?: string
  noteId?: string
  linkUrl?: string
  feedId?: string
  musicVideoId?: string
  musicArtist?: string
  musicCoverUrl?: string
  musicProvider?: string
  musicTrackKey?: string
  musicPayloadJson?: string
}

export interface ClipboardAssistPayload {
  query: string
  hits: QuickAccessHit[]
}
