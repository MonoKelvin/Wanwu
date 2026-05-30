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
  groupId: string
  createdAt: string
  item: FavoriteItemPreview | null
}

export interface FavoriteGroup {
  id: string
  name: string
  sortOrder: number
  items: FavoriteEntry[]
}
