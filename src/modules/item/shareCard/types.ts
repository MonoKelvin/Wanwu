export type ShareCardTemplateId =
  | 'classic'
  | 'center'
  | 'corner'
  | 'vivid'
  | 'cinema'
  | 'minimal'
  | 'split'

export interface ShareCardTemplateMeta {
  id: ShareCardTemplateId
  label: string
  description: string
}

export interface ShareCardContent {
  title: string
  summaryLines: string[]
  /** 特点：规格，最多 3 条 */
  highlights: string[]
}

export interface ShareCardPalette {
  /** 采样区平均 RGB */
  avgR: number
  avgG: number
  avgB: number
  luminance: number
  isDark: boolean
  /** 主色（用于渐变/点缀） */
  accent: string
  accentRgb: [number, number, number]
  /** 文字区推荐前景色 */
  textPrimary: string
  textSecondary: string
  /** 衬底/scrim 起止色 */
  scrimFrom: string
  scrimTo: string
}

export interface ShareCardTypography {
  brand: string
  title: string
  summary: string
  highlight: string
  tag: string
  watermark: string
}

export const SHARE_CARD_WIDTH = 1080
export const SHARE_CARD_HEIGHT = 1440

export const FONT_STACK =
  '"PingFang SC", "Source Han Sans SC", "Microsoft YaHei", system-ui, sans-serif'

export const FONT_MONO = 'ui-monospace, "Cascadia Code", Consolas, monospace'
