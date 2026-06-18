/** 全局唤起器 / 托盘 / 剪贴板联想 共用 */

/** 核心 kind；插件模块可注册任意 string kind */
export type CoreQuickAccessHitKind =
  | 'library'
  | 'note'
  | 'link'
  | 'rss'
  | 'music'
  | 'favorite'
  | 'diagram'

export type QuickAccessHitKind = CoreQuickAccessHitKind | (string & {})

export interface QuickAccessHit {
  kind: QuickAccessHitKind
  id: string
  title: string
  subtitle: string | null
  /** 图鉴 / 收藏条目 */
  itemSource?: 'library' | 'rss'
  itemId?: string
  noteId?: string
  diagramFileId?: string
  linkUrl?: string
  feedId?: string
  musicVideoId?: string
  musicArtist?: string
  musicCoverUrl?: string
  musicProvider?: string
  musicTrackKey?: string
  musicPayloadJson?: string
  /** 插件模块扩展字段（如闲读 tab、favoriteId） */
  payload?: Record<string, unknown>
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
  diagramFileId?: string
  linkUrl?: string
  feedId?: string
  musicVideoId?: string
  musicArtist?: string
  musicCoverUrl?: string
  musicProvider?: string
  musicTrackKey?: string
  musicPayloadJson?: string
  payload?: Record<string, unknown>
}

export interface ClipboardAssistPayload {
  query: string
  hits: QuickAccessHit[]
}
