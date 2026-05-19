import type { FavoriteEntry, FavoriteGroup } from './favorite'
import type { Category, Item, LibrarySearchHit } from './item'
import type { AppSettings } from './settings'
import type { RssEntry, RssFeed, RssFeedInput, RssFeedUpdate, RssGroup } from './rss'

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
  user: {
    getProfile: () => Promise<{ nickname: string; bio: string } | null>
    updateProfile: (profile: { nickname: string; bio: string }) => Promise<void>
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
    getPaths: () => Promise<{ userData: string; wanwu: string }>
    getSettings: () => Promise<AppSettings>
    updateSettings: (settings: AppSettings) => Promise<void>
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
    showItemInFolder: (url: string) => Promise<{ ok: boolean }>
    copyText: (text: string) => Promise<void>
    pickImageFile: () => Promise<{ ok: boolean; path?: string; canceled?: boolean }>
    savePngDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveImageDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveTextFile: (params: {
      content: string
      defaultName?: string
      extension?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
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
