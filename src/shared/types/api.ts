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
  }
  custom: {
    checkDuplicate: (name: string) => Promise<{ duplicate: boolean; suggestModule?: string; categoryId?: string }>
    listCategories: () => Promise<Category[]>
    listItems: (params: { categoryId: string }) => Promise<Item[]>
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
    listFavorites: () => Promise<unknown[]>
    toggleFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
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
  }
}
