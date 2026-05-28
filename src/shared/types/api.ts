import type { FavoriteEntry, FavoriteGroup } from './favorite'
import type { Category, Item, LibrarySearchHit } from './item'
import type {
  LinkBookmark,
  LinkFolder,
  BrowserSourceStatus,
  LinksProbeProgress,
  LinksProbeSummary,
  LinksSyncResult
} from './links'
import type { AppSettings } from './settings'
import type { RssEntry, RssFeed, RssFeedInput, RssFeedUpdate, RssGroup } from './rss'
import type { NoteCreateInput, NoteImage, NoteItem, NoteUpdateInput } from './notes'

export interface WanwuApi {
  library: {
    listCategories: () => Promise<Category[]>
    listItems: (params: { categoryId: string; subCategoryId?: string }) => Promise<Item[]>
    searchItems: (params: { query: string; limit?: number }) => Promise<LibrarySearchHit[]>
    getItem: (id: string) => Promise<Item | null>
    updateItem: (item: Item) => Promise<Item>
    createItem: (item: Partial<Item>) => Promise<Item>
    uploadItemImage: (params: { itemId: string; filePath: string }) => Promise<Item>
  }
  links: {
    listFolders: () => Promise<LinkFolder[]>
    listBookmarks: (params: { folderId: string; includeDeleted?: boolean }) => Promise<LinkBookmark[]>
    listAllBookmarks: () => Promise<LinkBookmark[]>
    listBrowserSources: () => Promise<BrowserSourceStatus[]>
    syncFromBrowser: (params: { browserSourceId: string }) => Promise<LinksSyncResult>
    syncToBrowser: (params: { browserSourceId: string }) => Promise<LinksSyncResult>
    reorderBookmarks: (params: { folderId: string; orderedIds: string[] }) => Promise<void>
    /** @deprecated 使用 syncFromBrowser / syncToBrowser */
    sync: () => Promise<LinksSyncResult>
    createFolder: (input: { parentId: string; name: string }) => Promise<LinkFolder>
    deleteFolder: (input: { folderId: string; moveBookmarksToRoot: boolean }) => Promise<void>
    createBookmark: (input: { folderId: string; title: string; url: string }) => Promise<LinkBookmark>
    updateBookmark: (input: {
      id: string
      title?: string
      url?: string
      folderId?: string
    }) => Promise<LinkBookmark | null>
    softDeleteBookmark: (id: string) => Promise<void>
    restoreBookmark: (id: string) => Promise<void>
    permanentDeleteBookmark: (id: string) => Promise<void>
    probeUnreachable: (
      ids: string[],
      onProgress?: (progress: LinksProbeProgress) => void
    ) => Promise<LinksProbeSummary>
    onBookmarksFileChanged: (
      listener: (payload: { browserSourceId: string }) => void
    ) => () => void
  }
  rss: {
    listGroups: () => Promise<RssGroup[]>
    createGroup: (name: string) => Promise<RssGroup>
    renameGroup: (groupId: string, name: string) => Promise<void>
    deleteGroup: (groupId: string) => Promise<void>
    listFeeds: () => Promise<RssFeed[]>
    createFeed: (input: RssFeedInput) => Promise<RssFeed>
    updateFeed: (input: RssFeedUpdate) => Promise<RssFeed>
    moveFeed: (feedId: string, groupId: string, sortOrder?: number) => Promise<void>
    softDeleteFeed: (feedId: string) => Promise<void>
    restoreFeed: (feedId: string) => Promise<void>
    permanentDeleteFeed: (feedId: string) => Promise<void>
    emptyRecycleBin: () => Promise<void>
    probeFeed: (feedId: string) => Promise<{ feedId: string; reachable: boolean; accessWarning: string | null }>
    fetchFeed: (feedId: string, fetchLimit?: number) => Promise<{ ok: boolean; count: number; total: number; error?: string }>
    listEntries: (
      feedId: string,
      limit?: number,
      offset?: number
    ) => Promise<{ items: RssEntry[]; total: number }>
  }
  notes: {
    listNotes: () => Promise<NoteItem[]>
    createNote: (input?: NoteCreateInput) => Promise<NoteItem>
    updateNote: (input: NoteUpdateInput) => Promise<NoteItem | null>
    deleteNote: (id: string) => Promise<boolean>
    addImage: (params: { noteId: string; filePath: string }) => Promise<NoteImage>
    removeImage: (imageId: string) => Promise<boolean>
  }
  user: {
    getProfile: () => Promise<{
      nickname: string
      bio: string
      avatarPath: string | null
      backgroundPath: string | null
      backgroundConfig: Record<string, unknown> | null
    } | null>
    updateProfile: (profile: {
      nickname: string
      bio: string
      avatarPath?: string | null
      backgroundPath?: string | null
      backgroundConfig?: Record<string, unknown> | null
    }) => Promise<void>
    importProfileImage: (params: {
      kind: 'avatar' | 'background'
      filePath: string
    }) => Promise<{ relativePath: string; url: string | null }>
    clearBackground: () => Promise<void>
    listFavorites: () => Promise<FavoriteEntry[]>
    listFavoriteGroups: () => Promise<FavoriteGroup[]>
    listFavoriteGroupsForPicker: () => Promise<Array<{ id: string; name: string; sortOrder: number }>>
    createFavoriteGroup: (name: string) => Promise<{ id: string; name: string; sortOrder: number }>
    isFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    addFavorite: (params: { itemId: string; source: string; groupId: string }) => Promise<boolean>
    removeFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    toggleFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    isLiked: (params: { itemId: string; source: string }) => Promise<boolean>
    addLike: (params: { itemId: string; source: string }) => Promise<boolean>
    removeLike: (params: { itemId: string; source: string }) => Promise<boolean>
  }
  app: {
    getPaths: () => Promise<{
      userData: string
      wanwu: string
      defaultWanwu: string
      isCustom: boolean
    }>
    getStartupNotices: () => Promise<string[]>
    /** 图鉴 bootstrap 完成后推送（如导入失败提示） */
    onStartupNotice: (listener: (message: string) => void) => () => void
    openDataDirectory: () => Promise<{ ok: boolean }>
    pickDataDirectoryParent: () => Promise<
      | { ok: true; parentDir: string; targetPath: string }
      | { ok: false; canceled?: boolean; error?: string }
    >
    migrateDataDirectory: (params: {
      parentDir: string
      overwriteExisting?: boolean
    }) => Promise<
      | { ok: true; targetPath: string }
      | { ok: false; error: string; code?: string }
    >
    getSettings: () => Promise<AppSettings>
    updateSettings: (settings: AppSettings) => Promise<AppSettings>
    patchSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
    createBackup: () => Promise<
      | { ok: true; path: string; bytes: number }
      | { ok: false; canceled?: boolean; error?: string }
    >
    restoreBackup: () => Promise<{ ok: true } | { ok: false; canceled?: boolean; error?: string }>
    clearCache: () => Promise<{ ok: true; bytesFreed: number }>
    resetSettings: () => Promise<AppSettings>
    exportDiagnostics: () => Promise<
      | { ok: true; path: string }
      | { ok: false; canceled?: boolean; error?: string }
    >
  }
  window: {
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<boolean>
    isMaximized: () => Promise<boolean>
    close: () => Promise<void>
    onMaximizedChange: (listener: (maximized: boolean) => void) => () => void
  }
  shell: {
    openExternal: (url: string) => Promise<void>
    downloadFile: (params: {
      url: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    showItemInFolder: (pathOrUrl: string) => Promise<{ ok: boolean; error?: string }>
    copyText: (text: string) => Promise<void>
    copyImage: (url: string) => Promise<{ ok: boolean; error?: string }>
    pickImageFile: () => Promise<{ ok: boolean; path?: string; canceled?: boolean }>
    savePngDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveImageDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveClipboardImageDataUrlToTemp: (params: {
      dataUrl: string
    }) => Promise<{ ok: boolean; path?: string; error?: string }>
    saveTextFile: (params: {
      content: string
      defaultName?: string
      extension?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    /** 大图查看：本地直链或远程临时缓存 */
    cacheImageForViewer: (url: string) => Promise<{
      ok: boolean
      displayUrl?: string
      cacheId?: number
      error?: string
    }>
    releaseViewerImageCache: (cacheId: number) => Promise<void>
  }
  share: {
    canNativeShare: () => Promise<boolean>
    nativeShare: (params: {
      title?: string
      text?: string
      dataUrl?: string
      textContent?: string
      fileName: string
    }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>
    uploadTemp: (params: {
      dataUrl?: string
      textContent?: string
      fileName: string
      expire?: '1h' | '12h' | '24h' | '72h'
    }) => Promise<
      | { ok: true; url: string; expire: string; expiresInHours: number }
      | { ok: false; error: string }
    >
  }
}
