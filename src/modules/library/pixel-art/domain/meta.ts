/** 模块 ID、路由、分组与包路径等稳定元数据 */

export const PIXEL_ART_MODULE_ID = 'wanwu.library.pixel-art'

export const PIXEL_ART_DOC_TYPE = 'pixel-art' as const
export type PixelArtDocType = typeof PIXEL_ART_DOC_TYPE

export const PIXEL_WPP_FILE_EXTENSION = '.wpp'

export const PIXEL_PACKAGE_PATHS = {
  meta: 'content/meta.json',
  frame: (frameId: string) => `content/frames/${frameId}.json`,
  layer: (layerId: string) => `content/layers/${layerId}.png`,
  asset: (assetId: string, ext: string) => `assets/${assetId}.${ext}`
} as const

export const LIBRARY_PIXEL_ART_HOME = 'library-pixel-art-home' as const
export const LIBRARY_PIXEL_ART_FOLDER = 'library-pixel-art-folder' as const
export const LIBRARY_PIXEL_ART_EDITOR_ROUTE = 'pixel-art-editor' as const

export function isPixelEditorPath(path: string): boolean {
  return /^\/pixel-art\/edit\/[^/?#]+/.test(path)
}

export function isPixelEditorRoute(
  name: string | symbol | null | undefined,
  path: string
): boolean {
  return name === LIBRARY_PIXEL_ART_EDITOR_ROUTE || isPixelEditorPath(path)
}

export const PA_HOME = 'pa-home'
export const PA_FILES = 'pa-files'
export const PA_RECYCLE = 'pa-recycle'

export const PA_SYSTEM_FOLDER_IDS = [PA_HOME, PA_FILES, PA_RECYCLE] as const
export type PixelSystemFolderId = (typeof PA_SYSTEM_FOLDER_IDS)[number]

export function isPixelSystemFolderId(id: string): id is PixelSystemFolderId {
  return (PA_SYSTEM_FOLDER_IDS as readonly string[]).includes(id)
}

export function isPixelCustomFolderId(id: string): boolean {
  return id.startsWith('pa-custom-')
}

export function isPixelVirtualHomeFolder(id: string): boolean {
  return id === PA_HOME
}

export const PIXEL_DEFAULT_SIZE = { width: 32, height: 32 } as const
export const PIXEL_SIZE_PRESETS = [16, 32, 64, 128] as const
export const PIXEL_MAX_WIDTH = 512
export const PIXEL_MAX_HEIGHT = 512
export const PIXEL_MAX_LAYERS = 32
export const PIXEL_AUTOSAVE_DEBOUNCE_MS = 2000
export const PIXEL_MAX_UNDO_STACK = 100
export const PIXEL_BRUSH_MIN = 1
export const PIXEL_BRUSH_MAX = 8
export const PIXEL_ZOOM_LEVELS = [1, 2, 4, 8, 16, 32] as const

export const PIXEL_PALETTE_PRESETS = {
  default: [
    '#000000',
    '#FFFFFF',
    '#FF6B6B',
    '#4ECDC4',
    '#FFE66D',
    '#95E1D3',
    '#F38181',
    '#AA96DA'
  ],
  retro: [
    '#1a1c2c',
    '#5d275d',
    '#b13e53',
    '#ef7d57',
    '#ffcd75',
    '#a7f070',
    '#38b764',
    '#257179',
    '#29366f',
    '#3b5dc9',
    '#41a6f6',
    '#73eff7',
    '#f4f4f4',
    '#94b0c2',
    '#566c86',
    '#333c57'
  ]
} as const

export const DEFAULT_FRAME_ID = 'frame-0'
