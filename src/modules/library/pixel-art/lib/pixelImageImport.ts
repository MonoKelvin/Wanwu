import { PIXEL_MAX_HEIGHT, PIXEL_MAX_WIDTH } from '@modules/library/pixel-art/domain/meta'
import { createBlankPixelDocument } from '@modules/library/pixel-art/lib/blankDocument'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import { resolveImageViewerUrl } from '@shared/markdown/utils/imageViewerUrl'

export interface PixelImportCrop {
  /** 0–1，相对原图 */
  x: number
  y: number
  w: number
  h: number
}

export interface PixelImportColorAdjust {
  brightness: number
  contrast: number
  saturation: number
}

export interface PixelImportSettings {
  outputWidth: number
  outputHeight: number
  crop: PixelImportCrop
  color: PixelImportColorAdjust
}

export const DEFAULT_PIXEL_IMPORT_SETTINGS: PixelImportSettings = {
  outputWidth: 64,
  outputHeight: 64,
  crop: { x: 0, y: 0, w: 1, h: 1 },
  color: { brightness: 0, contrast: 0, saturation: 0 }
}

function localPathToFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/')
  return normalized.startsWith('/') ? `file://${normalized}` : `file:///${normalized}`
}

export async function loadImageElementFromSource(
  source: { kind: 'path'; path: string } | { kind: 'url'; url: string }
): Promise<{ image: HTMLImageElement; revoke?: () => void }> {
  const input =
    source.kind === 'path' ? localPathToFileUrl(source.path) : source.url.trim()
  const resolved = await resolveImageViewerUrl(input)
  const image = await loadImageElement(resolved.url)
  return { image, revoke: resolved.revoke }
}

export function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('无法加载图片'))
    img.src = src
  })
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function clampDimension(n: number): number {
  return Math.min(PIXEL_MAX_WIDTH, Math.max(1, Math.floor(n)))
}

export function clampImportSettings(settings: PixelImportSettings): PixelImportSettings {
  const crop = settings.crop
  const x = clamp01(crop.x)
  const y = clamp01(crop.y)
  const w = clamp01(Math.min(crop.w, 1 - x))
  const h = clamp01(Math.min(crop.h, 1 - y))
  return {
    outputWidth: clampDimension(settings.outputWidth),
    outputHeight: clampDimension(settings.outputHeight),
    crop: { x, y, w: Math.max(0.01, w), h: Math.max(0.01, h) },
    color: {
      brightness: Math.min(100, Math.max(-100, settings.color.brightness)),
      contrast: Math.min(100, Math.max(-100, settings.color.contrast)),
      saturation: Math.min(100, Math.max(-100, settings.color.saturation))
    }
  }
}

function cssFilter(color: PixelImportColorAdjust): string {
  const b = 100 + color.brightness
  const c = 100 + color.contrast
  const s = 100 + color.saturation
  return `brightness(${b}%) contrast(${c}%) saturate(${s}%)`
}

export function processImageImport(
  image: HTMLImageElement,
  settings: PixelImportSettings
): { pixels: Uint8ClampedArray; width: number; height: number } {
  const s = clampImportSettings(settings)
  const sw = Math.max(1, Math.round(image.naturalWidth * s.crop.w))
  const sh = Math.max(1, Math.round(image.naturalHeight * s.crop.h))
  const sx = Math.round(image.naturalWidth * s.crop.x)
  const sy = Math.round(image.naturalHeight * s.crop.y)

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = sw
  cropCanvas.height = sh
  const cropCtx = cropCanvas.getContext('2d')
  if (!cropCtx) throw new Error('无法创建画布')

  cropCtx.filter = cssFilter(s.color)
  cropCtx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh)
  cropCtx.filter = 'none'

  const outW = s.outputWidth
  const outH = s.outputHeight
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('无法创建画布')

  outCtx.imageSmoothingEnabled = false
  outCtx.drawImage(cropCanvas, 0, 0, sw, sh, 0, 0, outW, outH)

  const data = outCtx.getImageData(0, 0, outW, outH)
  return { pixels: new Uint8ClampedArray(data.data), width: outW, height: outH }
}

function extractPalette(pixels: Uint8ClampedArray, max = 16): string[] {
  const seen = new Map<string, number>()
  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3]
    if (a < 16) continue
    const hex =
      `#${[pixels[i], pixels[i + 1], pixels[i + 2]]
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`.toUpperCase()
    seen.set(hex, (seen.get(hex) ?? 0) + 1)
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([hex]) => hex)
}

export function createDocumentFromImport(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  title: string
): PixelDocument {
  const doc = createBlankPixelDocument(width, height, normalizeImportTitle(title))
  const frame = doc.frames[0]!
  const layerId = frame.layerOrder[0]!
  doc.layerPixels[layerId] = pixels
  const palette = extractPalette(pixels)
  if (palette.length) doc.meta.palette = palette
  return doc
}

export function normalizeImportTitle(input: string): string {
  const base = input.trim() || '导入的像素画'
  return base.replace(/\.wpp$/i, '').trim() || '导入的像素画'
}

export function suggestOutputSize(
  image: HTMLImageElement,
  crop: PixelImportCrop
): { width: number; height: number } {
  const sw = Math.max(1, Math.round(image.naturalWidth * crop.w))
  const sh = Math.max(1, Math.round(image.naturalHeight * crop.h))
  const maxSide = Math.max(sw, sh)
  const presets = [16, 32, 64, 128, 256]
  let target = presets.find((p) => p >= maxSide) ?? 128
  if (target > PIXEL_MAX_WIDTH) target = PIXEL_MAX_WIDTH
  const aspect = sw / sh
  if (aspect >= 1) {
    return {
      width: target,
      height: clampDimension(Math.round(target / aspect))
    }
  }
  return {
    width: clampDimension(Math.round(target * aspect)),
    height: target
  }
}
