import type { Category, Item } from './item'

export interface WanwuApi {
  library: {
    listCategories: () => Promise<Category[]>
    listItems: (params: { categoryId: string; subCategoryId?: string }) => Promise<Item[]>
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
    listFeeds: () => Promise<
      Array<{
        id: string
        title: string
        url: string
        enabled: boolean
        isDefault: boolean
        lastFetchedAt: string | null
      }>
    >
    fetchFeed: (feedId: string) => Promise<{ ok: boolean; count: number; error?: string }>
    listEntries: (feedId: string) => Promise<
      Array<{ id: string; feedId: string; title: string; summary: string; link: string; publishedAt: string }>
    >
  }
  user: {
    getProfile: () => Promise<{ nickname: string; bio: string } | null>
    updateProfile: (profile: { nickname: string; bio: string }) => Promise<void>
    listFavorites: () => Promise<unknown[]>
    toggleFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
  }
  app: {
    getPaths: () => Promise<{ userData: string; wanwu: string }>
  }
}
