import type { ShareCardPalette } from './types'

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v))
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, '0')).join('')}`
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b
}

function saturateRgb(r: number, g: number, b: number, amount: number): [number, number, number] {
  const avg = (r + g + b) / 3
  return [
    clamp(avg + (r - avg) * amount, 0, 255),
    clamp(avg + (g - avg) * amount, 0, 255),
    clamp(avg + (b - avg) * amount, 0, 255)
  ]
}

/** 从画布区域采样，生成文字/衬底配色 */
export function extractPaletteFromCanvas(
  source: HTMLCanvasElement,
  region?: { x: number; y: number; w: number; h: number }
): ShareCardPalette {
  const sample = document.createElement('canvas')
  sample.width = 48
  sample.height = 48
  const ctx = sample.getContext('2d')
  if (!ctx) {
    return fallbackPalette()
  }

  const sx = region?.x ?? 0
  const sy = region?.y ?? 0
  const sw = region?.w ?? source.width
  const sh = region?.h ?? source.height

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 48, 48)
  let data: Uint8ClampedArray
  try {
    data = ctx.getImageData(0, 0, 48, 48).data
  } catch {
    return fallbackPalette()
  }

  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 16) continue
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
    n++
  }
  if (!n) return fallbackPalette()

  r /= n
  g /= n
  b /= n

  const lum = luminance(r, g, b)
  const isDark = lum < 145
  const [ar, ag, ab] = saturateRgb(r, g, b, 1.35)
  const accent = rgbToHex(ar, ag, ab)

  const textPrimary = isDark ? '#f8f8f9' : '#121214'
  const textSecondary = isDark ? 'rgba(248, 248, 249, 0.82)' : 'rgba(18, 18, 22, 0.72)'

  const scrimFrom = isDark ? 'rgba(8, 8, 10, 0)' : 'rgba(255, 255, 255, 0)'
  const scrimTo = isDark ? 'rgba(8, 8, 10, 0.82)' : 'rgba(255, 255, 255, 0.88)'

  return {
    avgR: r,
    avgG: g,
    avgB: b,
    luminance: lum,
    isDark,
    accent,
    accentRgb: [ar, ag, ab],
    textPrimary,
    textSecondary,
    scrimFrom,
    scrimTo
  }
}

function fallbackPalette(): ShareCardPalette {
  return {
    avgR: 120,
    avgG: 120,
    avgB: 125,
    luminance: 120,
    isDark: true,
    accent: '#5a5a62',
    accentRgb: [90, 90, 98],
    textPrimary: '#f8f8f9',
    textSecondary: 'rgba(248, 248, 249, 0.82)',
    scrimFrom: 'rgba(8, 8, 10, 0)',
    scrimTo: 'rgba(8, 8, 10, 0.82)'
  }
}

/** 居中/毛玻璃面板：固定深字 + 浅底，与图片解耦 */
export function paletteForLightPanel(): ShareCardPalette {
  const base = fallbackPalette()
  return {
    ...base,
    textPrimary: '#121214',
    textSecondary: 'rgba(18, 18, 22, 0.68)',
    scrimFrom: 'rgba(255, 255, 255, 0)',
    scrimTo: 'rgba(255, 255, 255, 0.92)'
  }
}

/** 活跃模板：强制深色渐变 + 白字 */
export function paletteForVivid(accentRgb: [number, number, number]): ShareCardPalette {
  const [r, g, b] = accentRgb
  return {
    avgR: r,
    avgG: g,
    avgB: b,
    luminance: 60,
    isDark: true,
    accent: rgbToHex(r, g, b),
    accentRgb: accentRgb,
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255, 255, 255, 0.88)',
    scrimFrom: `rgba(${Math.round(r * 0.35)}, ${Math.round(g * 0.35)}, ${Math.round(b * 0.35)}, 0.15)`,
    scrimTo: `rgba(${Math.round(r * 0.22)}, ${Math.round(g * 0.22)}, ${Math.round(b * 0.22)}, 0.78)`
  }
}

export function typographyScale(width: number) {
  const s = width / 1080
  return {
    brand: `600 ${Math.round(22 * s)}px`,
    title: `700 ${Math.round(52 * s)}px`,
    titleCinema: `700 ${Math.round(58 * s)}px`,
    summary: `400 ${Math.round(28 * s)}px`,
    highlight: `500 ${Math.round(24 * s)}px`,
    tag: `500 ${Math.round(20 * s)}px`,
    watermark: `500 ${Math.round(20 * s)}px`
  }
}
