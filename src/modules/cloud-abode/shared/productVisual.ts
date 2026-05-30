import type { ProductCategory } from '@shared/types/cloud-abode'
import { assetUrl } from '@shared/utils/assetUrl'

export interface CategoryVisual {
  glyph: string
  label: string
  /** 用于渐变点缀的色相（deg） */
  hue: number
}

/** 低饱和色相，配合扁平中性商品卡背景 */
export const CATEGORY_VISUAL: Record<ProductCategory, CategoryVisual> = {
  VEHICLE: { glyph: '车', label: '跑车', hue: 210 },
  FURNITURE: { glyph: '居', label: '家具', hue: 35 },
  PLANT: { glyph: '植', label: '绿植', hue: 150 },
  PET: { glyph: '宠', label: '宠物', hue: 25 },
  ILLUSTRATION: { glyph: '绘', label: '立绘', hue: 270 },
  OTHER: { glyph: '物', label: '其他', hue: 0 }
}

export function categoryVisual(category: ProductCategory | string): CategoryVisual {
  return CATEGORY_VISUAL[category as ProductCategory] ?? CATEGORY_VISUAL.OTHER
}

/** 商品封面（seed 相对 assets/ 路径） */
export function cloudAbodeProductImageUrl(imagePath: string | null): string | null {
  if (!imagePath?.trim()) return null
  const normalized = imagePath.replace(/\\/g, '/').replace(/^\//, '')
  const full = normalized.startsWith('seed/') ? normalized : `seed/cloud-abode/${normalized}`
  try {
    return assetUrl(full)
  } catch {
    return null
  }
}
