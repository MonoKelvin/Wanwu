export const RSS_RECYCLE_GROUP_ID = '__recycle_bin__'
export const RSS_DEFAULT_GROUP_ID = '__default__'
export const RSS_GROUP_BLOG_ID = '__group_blog__'
export const RSS_GROUP_TECH_ID = '__group_tech__'
export const RSS_GROUP_COMMUNITY_ID = '__group_community__'
export const RSS_GROUP_OTHER_ID = '__group_other__'

/** 系统预置分组（固定 id，不可删除） */
export const SYSTEM_RSS_GROUP_IDS = [
  RSS_GROUP_BLOG_ID,
  RSS_GROUP_TECH_ID,
  RSS_GROUP_COMMUNITY_ID,
  RSS_GROUP_OTHER_ID
] as const

export const AUTO_ACCESS_WARNING = '无法连接该订阅源，请检查网络或 Feed 地址'

export interface RssDisplayOptions {
  showTitle: boolean
  showSummary: boolean
  showTime: boolean
  showHost: boolean
  showOpen: boolean
  showCopy: boolean
}

export const DEFAULT_RSS_DISPLAY: RssDisplayOptions = {
  showTitle: true,
  showSummary: true,
  showTime: true,
  showHost: true,
  showOpen: true,
  showCopy: true
}

export interface RssGroup {
  id: string
  name: string
  sortOrder: number
  isRecycleBin: boolean
  isSystem?: boolean
}

export interface RssFeed {
  id: string
  title: string
  url: string
  groupId: string
  enabled: boolean
  isDefault: boolean
  lastFetchedAt: string | null
  accessWarning: string | null
  accessWarningLocked: boolean
  sortOrder: number
  display: RssDisplayOptions
  deletedAt: string | null
  previousGroupId: string | null
  iconUrl?: string | null
}

export interface RssEntry {
  id: string
  feedId: string
  title: string
  summary: string
  link: string
  publishedAt: string
  imageUrl?: string | null
}

export interface RssFeedInput {
  title: string
  url: string
  groupId?: string
  display?: Partial<RssDisplayOptions>
}

export interface RssFeedUpdate {
  id: string
  title?: string
  url?: string
  groupId?: string
  display?: Partial<RssDisplayOptions>
}

export interface RssProbeResult {
  feedId: string
  reachable: boolean
  accessWarning: string | null
}
