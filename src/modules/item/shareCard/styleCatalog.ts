import type { ShareCardPalette } from './types'
import {
  DEFAULT_SHARE_CARD_FILTER,
  type ShareCardFilterId
} from './imageFilters'

export type { ShareCardFilterId } from './imageFilters'
export {
  DEFAULT_SHARE_CARD_FILTER,
  SHARE_CARD_FILTER_OPTIONS
} from './imageFilters'

export type ShareCardFontId = 'sans' | 'serif' | 'kai' | 'display' | 'light' | 'rounded'
export type ShareCardSizeId = 'compact' | 'standard' | 'large' | 'grand'
export type ShareCardColorId =
  | 'auto'
  | 'white'
  | 'black'
  | 'gold'
  | 'ice'
  | 'cream'
  | 'rose'
  | 'mint'
  | 'lavender'
  | 'coral'
  | 'charcoal'
  | 'sky'

export interface ShareCardStyle {
  fontId: ShareCardFontId
  sizeId: ShareCardSizeId
  colorId: ShareCardColorId
  filterId: ShareCardFilterId
}

export interface ShareCardColorOption {
  id: ShareCardColorId
  label: string
  swatch: string
}

export const DEFAULT_SHARE_CARD_STYLE: ShareCardStyle = {
  fontId: 'sans',
  sizeId: 'standard',
  colorId: 'auto',
  filterId: DEFAULT_SHARE_CARD_FILTER
}

export const SHARE_CARD_FONT_OPTIONS: {
  id: ShareCardFontId
  label: string
  stack: string
  weight?: number
}[] = [
  {
    id: 'sans',
    label: '现代黑体',
    stack: '"PingFang SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif'
  },
  {
    id: 'serif',
    label: '经典宋韵',
    stack: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif'
  },
  {
    id: 'kai',
    label: '文艺楷体',
    stack: '"STKaiti", "KaiTi", "FangSong", serif'
  },
  {
    id: 'display',
    label: '圆润标题',
    stack: '"Segoe UI Variable Display", "Segoe UI", "Helvetica Neue", "PingFang SC", sans-serif'
  },
  {
    id: 'light',
    label: '纤细雅黑',
    stack: '"Segoe UI Light", "PingFang SC", "Source Han Sans SC", sans-serif',
    weight: 300
  },
  {
    id: 'rounded',
    label: '圆体可爱',
    stack: '"Yu Gothic UI", "Microsoft YaHei UI", "PingFang SC", sans-serif'
  }
]

export const SHARE_CARD_SIZE_OPTIONS: { id: ShareCardSizeId; label: string }[] = [
  { id: 'compact', label: '紧凑' },
  { id: 'standard', label: '标准' },
  { id: 'large', label: '大气' },
  { id: 'grand', label: '超大气' }
]

export const SHARE_CARD_COLOR_OPTIONS: ShareCardColorOption[] = [
  { id: 'auto', label: '跟随封面', swatch: 'linear-gradient(135deg, #8a8a94 0%, #ececee 50%, #5a5a62 100%)' },
  { id: 'white', label: '纯白', swatch: '#ffffff' },
  { id: 'black', label: '纯黑', swatch: '#121214' },
  { id: 'gold', label: '暖金', swatch: '#f5e6c8' },
  { id: 'ice', label: '冷蓝', swatch: '#d8ecff' },
  { id: 'cream', label: '米白', swatch: '#faf6ef' },
  { id: 'rose', label: '柔粉', swatch: '#ffd9e3' },
  { id: 'mint', label: '薄荷', swatch: '#d4f5e9' },
  { id: 'lavender', label: '薰衣草', swatch: '#e8deff' },
  { id: 'coral', label: '珊瑚', swatch: '#ffb4a2' },
  { id: 'charcoal', label: '深灰', swatch: '#3a3a42' },
  { id: 'sky', label: '天青', swatch: '#b8e4ff' }
]

export function fontStackFor(id: ShareCardFontId): string {
  return SHARE_CARD_FONT_OPTIONS.find((f) => f.id === id)?.stack ?? SHARE_CARD_FONT_OPTIONS[0].stack
}

export function styleTypography(width: number, sizeId: ShareCardSizeId, fontId?: ShareCardFontId) {
  const s = width / 1080
  const sizes = {
    compact: {
      title: 38,
      summary: 22,
      highlight: 20,
      cinema: 44,
      brand: 18,
      lineTitle: 46,
      lineSummary: 30,
      lineHighlight: 26
    },
    standard: {
      title: 48,
      summary: 28,
      highlight: 24,
      cinema: 56,
      brand: 22,
      lineTitle: 54,
      lineSummary: 36,
      lineHighlight: 32
    },
    large: {
      title: 62,
      summary: 34,
      highlight: 28,
      cinema: 70,
      brand: 24,
      lineTitle: 66,
      lineSummary: 42,
      lineHighlight: 36
    },
    grand: {
      title: 76,
      summary: 38,
      highlight: 32,
      cinema: 84,
      brand: 26,
      lineTitle: 78,
      lineSummary: 46,
      lineHighlight: 40
    }
  }[sizeId]

  const titleWeight = fontId === 'light' ? '300' : '700'
  return {
    title: `${titleWeight} ${Math.round(sizes.title * s)}px`,
    titleCinema: `700 ${Math.round(sizes.cinema * s)}px`,
    summary: `400 ${Math.round(sizes.summary * s)}px`,
    highlight: `500 ${Math.round(sizes.highlight * s)}px`,
    brand: `600 ${Math.round(sizes.brand * s)}px`,
    lineGap: { title: sizes.lineTitle, summary: sizes.lineSummary, highlight: sizes.lineHighlight }
  }
}

export function applyStyleColorPalette(
  base: ShareCardPalette,
  colorId: ShareCardColorId
): ShareCardPalette {
  if (colorId === 'auto') return base
  const map: Record<
    Exclude<ShareCardColorId, 'auto'>,
    Pick<ShareCardPalette, 'textPrimary' | 'textSecondary' | 'isDark'>
  > = {
    white: { textPrimary: '#ffffff', textSecondary: 'rgba(255,255,255,0.86)', isDark: true },
    black: { textPrimary: '#121214', textSecondary: 'rgba(18,18,22,0.72)', isDark: false },
    gold: { textPrimary: '#fff8e7', textSecondary: 'rgba(255,248,231,0.84)', isDark: true },
    ice: { textPrimary: '#e8f4ff', textSecondary: 'rgba(232,244,255,0.86)', isDark: true },
    cream: { textPrimary: '#faf6ef', textSecondary: 'rgba(250,246,239,0.84)', isDark: true },
    rose: { textPrimary: '#fff0f4', textSecondary: 'rgba(255,240,244,0.86)', isDark: true },
    mint: { textPrimary: '#eafff6', textSecondary: 'rgba(234,255,246,0.86)', isDark: true },
    lavender: { textPrimary: '#f3eeff', textSecondary: 'rgba(243,238,255,0.86)', isDark: true },
    coral: { textPrimary: '#fff3ef', textSecondary: 'rgba(255,243,239,0.86)', isDark: true },
    charcoal: { textPrimary: '#f0f0f2', textSecondary: 'rgba(240,240,242,0.82)', isDark: true },
    sky: { textPrimary: '#eef9ff', textSecondary: 'rgba(238,249,255,0.86)', isDark: true }
  }
  return { ...base, ...map[colorId] }
}

export interface ResolvedShareCardStyle {
  fontStack: string
  type: ReturnType<typeof styleTypography>
  palette: ShareCardPalette
  lightBg: boolean
  useCustom: boolean
}

export function resolveShareCardStyle(
  basePalette: ShareCardPalette,
  width: number,
  cardStyle: ShareCardStyle | undefined,
  useCustomStyle: boolean
): ResolvedShareCardStyle {
  if (!useCustomStyle || !cardStyle) {
    const scale = width / 1080
    return {
      fontStack: fontStackFor('sans'),
      type: {
        title: `700 ${Math.round(52 * scale)}px`,
        titleCinema: `700 ${Math.round(58 * scale)}px`,
        summary: `400 ${Math.round(28 * scale)}px`,
        highlight: `500 ${Math.round(24 * scale)}px`,
        brand: `600 ${Math.round(22 * scale)}px`,
        lineGap: { title: 56, summary: 36, highlight: 32 }
      },
      palette: basePalette,
      lightBg: !basePalette.isDark,
      useCustom: false
    }
  }

  const palette = applyStyleColorPalette(basePalette, cardStyle.colorId)
  const type = styleTypography(width, cardStyle.sizeId, cardStyle.fontId)

  return {
    fontStack: fontStackFor(cardStyle.fontId),
    type,
    palette,
    lightBg: !palette.isDark,
    useCustom: true
  }
}
