/** 个人中心收藏 DTO（主进程） */

export interface FavoriteItemPreviewDto {
  id: string
  name: string
  summary: string | null
  coverPath: string | null
  categoryId: string
  subCategoryName: string | null
  source: 'library'
}

export interface FavoriteEntryDto {
  id: string
  itemId: string
  source: 'library' | 'rss'
  groupId: string
  createdAt: string
  item: FavoriteItemPreviewDto | null
}

export interface FavoriteGroupDto {
  id: string
  name: string
  sortOrder: number
  items: FavoriteEntryDto[]
}

export interface FavoriteGroupPickerDto {
  id: string
  name: string
  sortOrder: number
}
