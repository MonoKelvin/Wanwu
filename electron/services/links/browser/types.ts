/** 收藏夹存储引擎 */
export type BrowserBookmarkEngine = 'chromium' | 'firefox' | 'safari-plist'

/** 浏览器收藏夹同步提供方 */
export interface BrowserBookmarkProvider {
  /** 与 link_folders.source、external_id 前缀一致 */
  id: string
  rootFolderId: string
  displayName: string
  sortOrder: number
  engine: BrowserBookmarkEngine
  /** 是否支持写回浏览器（Firefox/Safari 当前仅拉取） */
  supportsWriteBack: boolean
  /** 解析主数据文件绝对路径；未安装则返回 null */
  resolveBookmarksPath: (profile?: string) => string | null
}

export type BrowserSourceStatus = {
  id: string
  displayName: string
  rootFolderId: string
  engine: BrowserBookmarkEngine
  available: boolean
  supportsWriteBack: boolean
  bookmarksPath: string | null
}
