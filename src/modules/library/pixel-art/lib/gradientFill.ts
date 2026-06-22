import type { PixelSelection } from '@modules/library/pixel-art/lib/selection'
import { selectionContains } from '@modules/library/pixel-art/lib/selection'

/** 4×4 Bayer matrix for ordered dithering */
const BAYER_4: readonly number[] = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5
]

export function applyLinearGradient(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  colorA: string,
  colorB: string,
  dither = false,
  selection: PixelSelection | null = null
): void {
  const a = parseColor(colorA)
  const b = parseColor(colorB)
  const dx = x1 - x0
  const dy = y1 - y0
  const lenSq = dx * dx + dy * dy || 1

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (selection && !selectionContains(selection, x, y)) continue
      let t = ((x - x0) * dx + (y - y0) * dy) / lenSq
      t = Math.max(0, Math.min(1, t))
      if (dither) {
        const threshold = (BAYER_4[(y & 3) * 4 + (x & 3)]! + 0.5) / 16
        t = t >= threshold ? 1 : 0
      }
      const i = (y * width + x) * 4
      data[i] = Math.round(a[0]! + (b[0]! - a[0]!) * t)
      data[i + 1] = Math.round(a[1]! + (b[1]! - a[1]!) * t)
      data[i + 2] = Math.round(a[2]! + (b[2]! - a[2]!) * t)
      data[i + 3] = Math.round(a[3]! + (b[3]! - a[3]!) * t)
    }
  }
}

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

function colorToHex(r: number, g: number, b: number, a: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  if (a < 255) return `#${hex(r)}${hex(g)}${hex(b)}${hex(a)}`
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

export function pickColorFromPixels(
  pixels: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  if (x < 0 || y < 0 || x >= width || y >= height) return '#00000000'
  const i = (y * width + x) * 4
  return colorToHex(pixels[i]!, pixels[i + 1]!, pixels[i + 2]!, pixels[i + 3]!)
}
