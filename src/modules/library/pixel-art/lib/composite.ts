import type { PixelDocument, PixelLayerMeta } from '@modules/library/pixel-art/domain/types'
import { getActiveFrame } from '@modules/library/pixel-art/lib/blankDocument'

function parseColor(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      255
    ]
  }
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16)
    ]
  }
  return [0, 0, 0, 255]
}

function blendPixel(
  out: Uint8ClampedArray,
  i: number,
  src: Uint8ClampedArray,
  opacity: number
): void {
  const sa = (src[i + 3]! / 255) * opacity
  if (sa <= 0) return
  const da = out[i + 3]! / 255
  const outA = sa + da * (1 - sa)
  if (outA <= 0) {
    out[i] = 0
    out[i + 1] = 0
    out[i + 2] = 0
    out[i + 3] = 0
    return
  }
  out[i] = Math.round((src[i]! * sa + out[i]! * da * (1 - sa)) / outA)
  out[i + 1] = Math.round((src[i + 1]! * sa + out[i + 1]! * da * (1 - sa)) / outA)
  out[i + 2] = Math.round((src[i + 2]! * sa + out[i + 2]! * da * (1 - sa)) / outA)
  out[i + 3] = Math.round(outA * 255)
}

export function compositeDocument(
  doc: PixelDocument,
  frameId?: string
): Uint8ClampedArray {
  const { width, height, background } = doc.meta
  const out = new Uint8ClampedArray(width * height * 4)
  if (background !== 'transparent') {
    const [r, g, b] = parseColor(background)
    for (let i = 0; i < out.length; i += 4) {
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = 255
    }
  }

  const frame = doc.frames.find((f) => f.id === (frameId ?? doc.meta.defaultFrameId)) ?? getActiveFrame(doc)
  const layerMap = new Map(frame.layers.map((l) => [l.id, l]))

  for (const layerId of frame.layerOrder) {
    const meta = layerMap.get(layerId)
    if (!meta?.visible) continue
    const src = doc.layerPixels[layerId]
    if (!src) continue
    for (let i = 0; i < out.length; i += 4) {
      blendPixel(out, i, src, meta.opacity)
    }
  }
  return out
}

export function compositeLayers(
  width: number,
  height: number,
  layers: Array<{ meta: PixelLayerMeta; pixels: Uint8ClampedArray }>,
  background: 'transparent' | string = 'transparent'
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height * 4)
  if (background !== 'transparent') {
    const [r, g, b] = parseColor(background)
    for (let i = 0; i < out.length; i += 4) {
      out[i] = r
      out[i + 1] = g
      out[i + 2] = b
      out[i + 3] = 255
    }
  }
  for (const { meta, pixels } of layers) {
    if (!meta.visible) continue
    for (let i = 0; i < out.length; i += 4) {
      blendPixel(out, i, pixels, meta.opacity)
    }
  }
  return out
}

export function pixelsToImageData(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): ImageData {
  return new ImageData(new Uint8ClampedArray(pixels), width, height)
}

export function imageDataToPixels(image: ImageData): Uint8ClampedArray {
  return new Uint8ClampedArray(image.data)
}
