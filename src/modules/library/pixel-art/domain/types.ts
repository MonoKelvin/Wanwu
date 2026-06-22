import type { ToolOptions } from '@modules/library/pixel-art/domain/tools'

export interface WppMetaFile {
  format: 'wanwu-pixel'
  formatVersion: 1
  title: string
  width: number
  height: number
  background: 'transparent' | string
  defaultFrameId: string
  activeLayerId: string
  foreground: string
  backgroundColor: string
  palette: string[]
  grid: { visible: boolean; size: number }
  checkerboard: { visible: boolean }
}

export interface PixelLayerMeta {
  id: string
  name: string
  visible: boolean
  locked: boolean
  opacity: number
}

export interface WppFrameFile {
  id: string
  name: string
  sortOrder: number
  durationMs: number
  layerOrder: string[]
  layers: PixelLayerMeta[]
}

export interface PixelFrame {
  id: string
  name: string
  sortOrder: number
  durationMs: number
  layerOrder: string[]
  layers: PixelLayerMeta[]
}

export interface PixelDocument {
  format: 'wanwu-pixel'
  formatVersion: 1
  meta: WppMetaFile
  frames: PixelFrame[]
  /** layerId → RGBA pixel data (length = width*height*4) */
  layerPixels: Record<string, Uint8ClampedArray>
}

export interface PixelFolder {
  id: string
  name: string
  kind: 'system' | 'custom'
  parentId: string | null
  sortOrder: number
  createdAt: string
  deletedAt: string | null
}

export interface PixelFileMeta {
  id: string
  folderId: string
  previousFolderId: string | null
  title: string
  width: number
  height: number
  pinned: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface PixelFileRecord {
  meta: PixelFileMeta
  content: PixelDocument
}

export interface PixelWritePatch {
  dirtyLayerIds: string[]
  meta?: Partial<WppMetaFile>
}

export interface WriteResult {
  ok: boolean
  reason?: 'not_found' | 'conflict'
  message?: string
  updatedAt?: string
}

export interface PixelExportResult {
  ok: boolean
  canceled?: boolean
  path?: string
  error?: string
}

export interface LayerPixelPatch {
  x: number
  y: number
  width: number
  height: number
  before: Uint8ClampedArray
  after: Uint8ClampedArray
}

export interface PixelViewport {
  zoom: number
  panX: number
  panY: number
}

export interface PixelEditorToolState {
  toolId: import('@modules/library/pixel-art/domain/tools').ToolId
  options: ToolOptions
  foreground: string
  backgroundColor: string
}

export type SvgExportMode = 'raster' | 'vector'
export type SvgVectorStrategy = 'merged' | 'per-pixel'

export interface ExportImageOptions {
  format: 'png' | 'jpeg' | 'svg' | 'wpp'
  jpegQuality?: number
  svgMode?: SvgExportMode
  svgVectorStrategy?: SvgVectorStrategy
}
