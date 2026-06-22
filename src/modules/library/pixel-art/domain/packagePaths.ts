export const PIXEL_WPP_FILE_EXTENSION = '.wpp'

export const PIXEL_PACKAGE_PATHS = {
  meta: 'content/meta.json',
  frame: (frameId: string) => `content/frames/${frameId}.json`,
  layer: (layerId: string) => `content/layers/${layerId}.png`,
  asset: (assetId: string, ext: string) => `assets/${assetId}.${ext}`
} as const
