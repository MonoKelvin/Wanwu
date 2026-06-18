import type { FavoriteItemPreviewDto } from '../main/service/types'

/** 图鉴模块向个人中心提供的收藏条目摘要能力（避免编译期依赖图鉴实现） */
export interface HandbookFavoriteItemSource {
  listItemSummariesByIds(ids: string[]): Map<string, FavoriteItemPreviewDto>
}
