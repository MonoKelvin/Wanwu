import type { ItemMediaAsset, MediaAttribution, UnsplashAttribution } from './unsplash'

export type ItemSource = 'library' | 'custom' | 'rss'

export interface LibrarySearchHit {
  id: string
  name: string
  summary: string | null
  categoryId: string
  categoryName: string
  subCategoryName: string | null
}

export type { ItemMediaAsset, MediaAttribution, UnsplashAttribution }

export interface Item {
  id: string
  categoryId: string
  subCategoryId: string | null
  subCategoryName?: string | null
  slug?: string | null
  source: ItemSource
  name: string
  summary: string | null
  description: string | null
  tags: string[]
  specs?: Record<string, string>
  coverPath?: string | null
  coverAttribution?: MediaAttribution | null
  /** @deprecated 使用 galleryAssets */
  gallery?: string[]
  galleryAssets?: ItemMediaAsset[]
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
