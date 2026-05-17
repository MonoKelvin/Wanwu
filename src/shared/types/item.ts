export type ItemSource = 'library' | 'custom' | 'rss'

export interface Item {
  id: string
  categoryId: string
  subCategoryId: string | null
  source: ItemSource
  name: string
  summary: string | null
  description: string | null
  tags: string[]
  coverPath?: string | null
  mediaIds?: string[]
  customFields?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  icon?: string
  parentId: string | null
  children?: Category[]
}
