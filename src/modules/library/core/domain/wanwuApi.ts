import type { Category, Item, LibrarySearchHit } from '@shared/types/item'

/** 全库（图鉴条目）IPC 能力块，通过模块 augmentation 合并进 WanwuApi */
export interface WanwuLibraryApi {
  library: {
    listCategories: () => Promise<Category[]>
    listItems: (params: { categoryId: string; subCategoryId?: string }) => Promise<Item[]>
    searchItems: (params: { query: string; limit?: number }) => Promise<LibrarySearchHit[]>
    getItem: (id: string) => Promise<Item | null>
    updateItem: (item: Item) => Promise<Item>
    createItem: (item: Partial<Item>) => Promise<Item>
    uploadItemImage: (params: { itemId: string; filePath: string }) => Promise<Item>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuLibraryApi {}
}
