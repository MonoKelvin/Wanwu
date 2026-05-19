import type { ItemSource } from './item'

export interface FavoriteItemPreview {
  id: string
  name: string
  summary: string | null
  coverPath: string | null
  categoryId: string
  subCategoryName: string | null
  source: ItemSource
}

export interface FavoriteEntry {
  id: string
  itemId: string
  source: ItemSource
  createdAt: string
  item: FavoriteItemPreview | null
}
