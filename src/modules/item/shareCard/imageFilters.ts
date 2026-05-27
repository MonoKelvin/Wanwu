export type ShareCardFilterId =
  | 'none'
  | 'blue'
  | 'vintage'
  | 'bw'
  | 'vivid'
  | 'japanese'
  | 'chinese'
  | 'warm'
  | 'cool'

export const SHARE_CARD_FILTER_OPTIONS: { id: ShareCardFilterId; label: string }[] = [
  { id: 'none', label: '原图' },
  { id: 'blue', label: '蓝调' },
  { id: 'vintage', label: '复古' },
  { id: 'bw', label: '黑白' },
  { id: 'vivid', label: '艳丽' },
  { id: 'japanese', label: '日系' },
  { id: 'chinese', label: '国风' },
  { id: 'warm', label: '暖色' },
  { id: 'cool', label: '冷色' }
]

export const DEFAULT_SHARE_CARD_FILTER: ShareCardFilterId = 'none'

/** Canvas 2D filter 字符串（仅作用于底图，与模板模式无关） */
export function canvasFilterCss(filterId: ShareCardFilterId): string {
  switch (filterId) {
    case 'blue':
      return 'saturate(1.12) hue-rotate(198deg) brightness(1.04) contrast(1.02)'
    case 'vintage':
      return 'sepia(0.45) contrast(0.9) brightness(1.06) saturate(0.85)'
    case 'bw':
      return 'grayscale(1) contrast(1.1) brightness(1.02)'
    case 'vivid':
      return 'saturate(1.6) contrast(1.12) brightness(1.04)'
    case 'japanese':
      return 'brightness(1.12) saturate(0.72) contrast(0.88) hue-rotate(-6deg)'
    case 'chinese':
      return 'sepia(0.32) saturate(1.08) hue-rotate(-20deg) brightness(1.05) contrast(0.94)'
    case 'warm':
      return 'sepia(0.18) saturate(1.2) hue-rotate(-12deg) brightness(1.04)'
    case 'cool':
      return 'saturate(0.95) hue-rotate(165deg) brightness(1.03) contrast(1.04)'
    default:
      return 'none'
  }
}

export function resolveShareCardFilter(
  filterId: ShareCardFilterId | undefined,
  useCustomStyle: boolean
): ShareCardFilterId {
  if (!useCustomStyle || !filterId || filterId === 'none') return 'none'
  return filterId
}
