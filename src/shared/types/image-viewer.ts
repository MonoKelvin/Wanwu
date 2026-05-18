import type { MediaAttribution } from '@shared/types/unsplash'

/** 通用大图查看器幻灯片 */
export interface ImageViewerSlide {
  url: string
  alt?: string
  attribution?: MediaAttribution | null
}
