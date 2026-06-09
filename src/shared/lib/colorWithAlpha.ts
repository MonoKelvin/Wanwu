export interface ParsedColor {
  r: number
  g: number
  b: number
  /** 0–1 */
  a: number
}

const TRANSPARENT_VALUES = new Set(['transparent', 'none'])

function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)))
}

function clampAlpha(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function parseHexChannel(pair: string): number {
  return parseInt(pair, 16)
}

function expandHex3(hex: string): string {
  return hex
    .split('')
    .map((ch) => ch + ch)
    .join('')
}

export function hslToRgb(h: number, s: number, l: number): Pick<ParsedColor, 'r' | 'g' | 'b'> {
  const hn = ((h % 360) + 360) % 360
  const sn = Math.min(100, Math.max(0, s)) / 100
  const ln = Math.min(100, Math.max(0, l)) / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = ln - c / 2

  let rp = 0
  let gp = 0
  let bp = 0
  if (hn < 60) [rp, gp, bp] = [c, x, 0]
  else if (hn < 120) [rp, gp, bp] = [x, c, 0]
  else if (hn < 180) [rp, gp, bp] = [0, c, x]
  else if (hn < 240) [rp, gp, bp] = [0, x, c]
  else if (hn < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]

  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255)
  }
}

/** 解析 CSS 颜色字符串，无法识别时返回 null */
export function parseColor(input: string | null | undefined): ParsedColor | null {
  if (input == null) return null
  const raw = input.trim()
  if (!raw) return null

  if (TRANSPARENT_VALUES.has(raw.toLowerCase())) {
    return { r: 255, g: 255, b: 255, a: 0 }
  }

  if (/^#[0-9a-fA-F]{8}$/.test(raw)) {
    return {
      r: parseHexChannel(raw.slice(1, 3)),
      g: parseHexChannel(raw.slice(3, 5)),
      b: parseHexChannel(raw.slice(5, 7)),
      a: clampAlpha(parseHexChannel(raw.slice(7, 9)) / 255)
    }
  }

  if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
    return {
      r: parseHexChannel(raw.slice(1, 3)),
      g: parseHexChannel(raw.slice(3, 5)),
      b: parseHexChannel(raw.slice(5, 7)),
      a: 1
    }
  }

  if (/^#[0-9a-fA-F]{3}$/.test(raw)) {
    const expanded = expandHex3(raw.slice(1))
    return {
      r: parseHexChannel(expanded.slice(0, 2)),
      g: parseHexChannel(expanded.slice(2, 4)),
      b: parseHexChannel(expanded.slice(4, 6)),
      a: 1
    }
  }

  const rgbaMatch = raw.match(
    /^rgba?\(\s*([\d.]+)(?:%)?\s*,\s*([\d.]+)(?:%)?\s*,\s*([\d.]+)(?:%)?(?:\s*,\s*([\d.]+%?))?\s*\)$/i
  )
  if (rgbaMatch) {
    const toChannel = (value: string, isPercent: boolean) => {
      const n = parseFloat(value)
      if (!Number.isFinite(n)) return 0
      return isPercent ? clampByte((n / 100) * 255) : clampByte(n)
    }
    const r = toChannel(rgbaMatch[1], rgbaMatch[1].endsWith('%'))
    const g = toChannel(rgbaMatch[2], rgbaMatch[2].endsWith('%'))
    const b = toChannel(rgbaMatch[3], rgbaMatch[3].endsWith('%'))
    let a = 1
    if (rgbaMatch[4] != null) {
      const alphaRaw = rgbaMatch[4]
      const alphaNum = parseFloat(alphaRaw)
      a = alphaRaw.endsWith('%') ? clampAlpha(alphaNum / 100) : clampAlpha(alphaNum)
    }
    return { r, g, b, a }
  }

  const hslaMatch = raw.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+%?))?\s*\)$/i
  )
  if (hslaMatch) {
    const h = parseFloat(hslaMatch[1])
    const s = parseFloat(hslaMatch[2])
    const l = parseFloat(hslaMatch[3])
    let a = 1
    if (hslaMatch[4] != null) {
      const alphaRaw = hslaMatch[4]
      const alphaNum = parseFloat(alphaRaw)
      a = alphaRaw.endsWith('%') ? clampAlpha(alphaNum / 100) : clampAlpha(alphaNum)
    }
    const { r, g, b } = hslToRgb(h, s, l)
    return { r, g, b, a }
  }

  return null
}

function toHexByte(n: number): string {
  return clampByte(n).toString(16).padStart(2, '0')
}

/** 供预览使用的 CSS 颜色 */
export function colorPreviewCss(input: string | null | undefined, fallback = '#ffffff'): string {
  const parsed = parseColor(input)
  if (!parsed) return fallback
  if (parsed.a <= 0) return 'transparent'
  if (parsed.a >= 1) {
    return `#${toHexByte(parsed.r)}${toHexByte(parsed.g)}${toHexByte(parsed.b)}`
  }
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${roundAlpha(parsed.a)})`
}

function roundAlpha(a: number): number {
  return Math.round(a * 1000) / 1000
}

export interface HsvaColor {
  h: number
  s: number
  v: number
  a: number
}

export type ColorValueFormat = 'hex' | 'rgb' | 'hsl'

export function rgbToHsv(r: number, g: number, b: number): Pick<HsvaColor, 'h' | 's' | 'v'> {
  const rn = clampByte(r) / 255
  const gn = clampByte(g) / 255
  const bn = clampByte(b) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min

  let h = 0
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  const s = max === 0 ? 0 : (delta / max) * 100
  const v = max * 100
  return { h, s, v }
}

export function hsvToRgb(h: number, s: number, v: number): Pick<ParsedColor, 'r' | 'g' | 'b'> {
  const hn = ((h % 360) + 360) % 360
  const sn = Math.min(100, Math.max(0, s)) / 100
  const vn = Math.min(100, Math.max(0, v)) / 100
  const c = vn * sn
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1))
  const m = vn - c

  let rp = 0
  let gp = 0
  let bp = 0
  if (hn < 60) [rp, gp, bp] = [c, x, 0]
  else if (hn < 120) [rp, gp, bp] = [x, c, 0]
  else if (hn < 180) [rp, gp, bp] = [0, c, x]
  else if (hn < 240) [rp, gp, bp] = [0, x, c]
  else if (hn < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]

  return {
    r: clampByte((rp + m) * 255),
    g: clampByte((gp + m) * 255),
    b: clampByte((bp + m) * 255)
  }
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = clampByte(r) / 255
  const gn = clampByte(g) / 255
  const bn = clampByte(b) / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }

  return { h, s: s * 100, l: l * 100 }
}

export function hsvaToParsed(hsva: HsvaColor): ParsedColor {
  const rgb = hsvToRgb(hsva.h, hsva.s, hsva.v)
  return { ...rgb, a: clampAlpha(hsva.a) }
}

export function parsedToHsva(parsed: ParsedColor): HsvaColor {
  const { h, s, v } = rgbToHsv(parsed.r, parsed.g, parsed.b)
  return { h, s, v, a: parsed.a }
}

export function formatHsvaHex(hsva: HsvaColor): string {
  const c = hsvaToParsed(hsva)
  const hex = `#${toHexByte(c.r)}${toHexByte(c.g)}${toHexByte(c.b)}`
  if (c.a >= 1) return hex.toUpperCase()
  return `${hex}${toHexByte(c.a * 255)}`.toUpperCase()
}

export function formatHsvaRgb(hsva: HsvaColor): string {
  const c = hsvaToParsed(hsva)
  if (c.a >= 1) return `rgb(${c.r}, ${c.g}, ${c.b})`
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${roundAlpha(c.a)})`
}

export function formatHsvaHsl(hsva: HsvaColor): string {
  const c = hsvaToParsed(hsva)
  const { h, s, l } = rgbToHsl(c.r, c.g, c.b)
  const hr = Math.round(h)
  const sr = Math.round(s)
  const lr = Math.round(l)
  if (c.a >= 1) return `hsl(${hr}, ${sr}%, ${lr}%)`
  return `hsla(${hr}, ${sr}%, ${lr}%, ${roundAlpha(c.a)})`
}

export function parseColorToHsva(input: string | null | undefined): HsvaColor {
  const parsed = parseColor(input) ?? { r: 255, g: 255, b: 255, a: 1 }
  const { h, s, v } = rgbToHsv(parsed.r, parsed.g, parsed.b)
  return { h, s, v, a: parsed.a }
}

export function formatHsva(hsva: HsvaColor, options: FormatColorOptions = {}): string {
  const rgb = hsvToRgb(hsva.h, hsva.s, hsva.v)
  return formatColor({ ...rgb, a: clampAlpha(hsva.a) }, options)
}

export interface FormatColorOptions {
  /** alpha 为 0 时输出 transparent 而非 rgba */
  transparentKeyword?: boolean
}

/** 将颜色格式化为可写入 SVG / CSS 的字符串 */
export function formatColor(
  color: ParsedColor,
  options: FormatColorOptions = {}
): string {
  const a = clampAlpha(color.a)
  if (a <= 0 && options.transparentKeyword) return 'transparent'
  if (a >= 1) {
    return `#${toHexByte(color.r)}${toHexByte(color.g)}${toHexByte(color.b)}`
  }
  return `rgba(${clampByte(color.r)}, ${clampByte(color.g)}, ${clampByte(color.b)}, ${roundAlpha(a)})`
}

export function formatColorFromInput(
  input: string | null | undefined,
  options: FormatColorOptions = {}
): string {
  const parsed = parseColor(input)
  if (!parsed) return input?.trim() || '#ffffff'
  return formatColor(parsed, options)
}
