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
