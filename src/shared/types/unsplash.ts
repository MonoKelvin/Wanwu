export type MediaAttributionSource = 'unsplash' | 'pixabay'

/** 全库配图归属（Unsplash 须 UTM；Pixabay 建议标注作者） */
export interface MediaAttribution {
  source?: MediaAttributionSource
  photographerName: string
  photographerUsername?: string
  photographerProfileUrl: string
  photoPageUrl: string
}

/** @deprecated 使用 MediaAttribution */
export type UnsplashAttribution = MediaAttribution

export interface ItemMediaAsset {
  url: string
  attribution?: MediaAttribution | null
}
