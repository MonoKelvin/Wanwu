import type { MediaAttribution } from '../../../src/shared/types/unsplash'

export const LIBRARY_CATALOG_SCHEMA = 3

export interface LibraryCatalogItem {
  /** 全库唯一稳定 id（种子配置必填，禁止入库时随机生成） */
  id: string
  slug: string
  categoryId: string
  subCategoryId: string
  name: string
  summary: string
  /** 已废弃：正文仅存 content.md，catalog 留空 */
  description?: string
  tags: string[]
  specs: Record<string, string>
  coverFile?: string
  galleryFiles?: string[]
  contentFile?: string
  coverAttribution?: MediaAttribution
  galleryAttributions?: MediaAttribution[]
  mediaProvider?: string
}

export interface LibraryCatalog {
  schema?: number
  version?: number
  mediaProvider?: string
  mediaConfigVersion?: number
  items: LibraryCatalogItem[]
}
