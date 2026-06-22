import { DEFAULT_FRAME_ID } from '@modules/library/pixel-art/domain/constants'
import type { PixelDocument, PixelLayerMeta } from '@modules/library/pixel-art/domain/types'

function newLayerId(): string {
  return `layer-${crypto.randomUUID()}`
}

function emptyPixels(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4)
}

export function createBlankPixelDocument(
  width = 32,
  height = 32,
  title = '未命名像素画'
): PixelDocument {
  const layerId = newLayerId()
  const layer: PixelLayerMeta = {
    id: layerId,
    name: '图层 1',
    visible: true,
    locked: false,
    opacity: 1
  }

  return {
    format: 'wanwu-pixel',
    formatVersion: 1,
    meta: {
      format: 'wanwu-pixel',
      formatVersion: 1,
      title,
      width,
      height,
      background: 'transparent',
      defaultFrameId: DEFAULT_FRAME_ID,
      activeLayerId: layerId,
      foreground: '#FF6B6B',
      backgroundColor: '#4ECDC4',
      palette: [
        '#000000',
        '#FFFFFF',
        '#FF6B6B',
        '#4ECDC4',
        '#FFE66D',
        '#95E1D3',
        '#F38181',
        '#AA96DA'
      ],
      grid: { visible: true, size: 1 },
      checkerboard: { visible: true }
    },
    frames: [
      {
        id: DEFAULT_FRAME_ID,
        name: '帧 1',
        sortOrder: 0,
        durationMs: 100,
        layerOrder: [layerId],
        layers: [layer]
      }
    ],
    layerPixels: {
      [layerId]: emptyPixels(width, height)
    }
  }
}

export function clonePixelDocument(doc: PixelDocument): PixelDocument {
  const layerPixels: Record<string, Uint8ClampedArray> = {}
  for (const [id, pixels] of Object.entries(doc.layerPixels)) {
    layerPixels[id] = new Uint8ClampedArray(pixels)
  }
  return {
    ...doc,
    meta: { ...doc.meta, palette: [...doc.meta.palette] },
    frames: doc.frames.map((f) => ({
      ...f,
      layerOrder: [...f.layerOrder],
      layers: f.layers.map((l) => ({ ...l }))
    })),
    layerPixels
  }
}

export function getActiveFrame(doc: PixelDocument) {
  return doc.frames.find((f) => f.id === doc.meta.defaultFrameId) ?? doc.frames[0]!
}

export function getActiveLayerMeta(doc: PixelDocument): PixelLayerMeta | null {
  const frame = getActiveFrame(doc)
  return frame.layers.find((l) => l.id === doc.meta.activeLayerId) ?? null
}
