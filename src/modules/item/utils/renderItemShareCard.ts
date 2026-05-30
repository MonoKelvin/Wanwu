import type { Item } from '@shared/types/item'
import { buildShareCardContent } from '../shareCard/buildShareCardContent'
import { drawCoverImage, drawPlaceholder, loadImage } from '../shareCard/canvasUtils'
import { extractPaletteFromCanvas } from '../shareCard/extractImagePalette'
import { resolveShareCardFilter } from '../shareCard/imageFilters'
import {
  DEFAULT_SHARE_CARD_STYLE,
  type ShareCardStyle
} from '../shareCard/styleCatalog'
import { DEFAULT_SHARE_CARD_TEMPLATE } from '../shareCard/templateCatalog'
import {
  renderShareCardTemplate,
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH
} from '../shareCard/templates'
import type { ShareCardTemplateId } from '../shareCard/types'

export type { ShareCardTemplateId } from '../shareCard/types'
export type { ShareCardStyle } from '../shareCard/styleCatalog'
export {
  SHARE_CARD_TEMPLATES,
  DEFAULT_SHARE_CARD_TEMPLATE
} from '../shareCard/templateCatalog'
export {
  DEFAULT_SHARE_CARD_STYLE,
  SHARE_CARD_FONT_OPTIONS,
  SHARE_CARD_SIZE_OPTIONS,
  SHARE_CARD_COLOR_OPTIONS,
  SHARE_CARD_FILTER_OPTIONS
} from '../shareCard/styleCatalog'

export interface RenderShareCardOptions {
  style?: ShareCardStyle
  useCustomStyle?: boolean
}

function paletteRegionForTemplate(templateId: ShareCardTemplateId, width: number, height: number) {
  if (templateId === 'center') {
    return {
      x: Math.floor(width * 0.12),
      y: Math.floor(height * 0.32),
      w: Math.floor(width * 0.76),
      h: Math.floor(height * 0.38)
    }
  }
  if (templateId === 'split') {
    return {
      x: 0,
      y: Math.floor(height * 0.58),
      w: width,
      h: Math.floor(height * 0.42)
    }
  }
  if (templateId === 'minimal') {
    return {
      x: 0,
      y: 0,
      w: width,
      h: Math.floor(height * 0.32)
    }
  }
  return {
    x: 0,
    y: Math.floor(height * 0.55),
    w: width,
    h: Math.floor(height * 0.45)
  }
}

function paletteForTemplate(
  templateId: ShareCardTemplateId,
  sampled: ReturnType<typeof extractPaletteFromCanvas>
) {
  if (templateId === 'corner' || templateId === 'minimal') {
    return {
      ...sampled,
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.84)'
    }
  }
  if (templateId === 'cinema') {
    return {
      ...sampled,
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255,255,255,0.78)'
    }
  }
  if (templateId === 'split') {
    return {
      ...sampled,
      textPrimary: '#121214',
      textSecondary: 'rgba(18,18,22,0.68)',
      isDark: false
    }
  }
  return sampled
}

/** 生成物品分享卡片（PNG data URL） */
export async function renderItemShareCard(
  item: Item,
  coverUrl: string | null,
  templateId: ShareCardTemplateId = DEFAULT_SHARE_CARD_TEMPLATE,
  options: RenderShareCardOptions = {}
): Promise<string> {
  const { style = DEFAULT_SHARE_CARD_STYLE, useCustomStyle = false } = options
  const filterId = resolveShareCardFilter(style.filterId, useCustomStyle)
  const width = SHARE_CARD_WIDTH
  const height = SHARE_CARD_HEIGHT
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_unavailable')

  let image: HTMLImageElement | null = null
  if (coverUrl) {
    try {
      image = await loadImage(coverUrl)
    } catch {
      image = null
    }
  }

  const content = buildShareCardContent(item)
  const renderInput = {
    ctx,
    width,
    height,
    content,
    palette: extractPaletteFromCanvas(canvas),
    image,
    cardStyle: style,
    useCustomStyle,
    filterId
  }

  if (image) {
    const tmp = document.createElement('canvas')
    tmp.width = width
    tmp.height = height
    const tctx = tmp.getContext('2d')!
    drawCoverImage(tctx, image, width, height, filterId)

    const region = paletteRegionForTemplate(templateId, width, height)
    const sampled = extractPaletteFromCanvas(tmp, region)
    renderInput.palette = paletteForTemplate(templateId, sampled)
    renderInput.image = image
  } else {
    drawPlaceholder(ctx, width, height)
    const sampled = extractPaletteFromCanvas(canvas)
    renderInput.palette = paletteForTemplate(templateId, sampled)
  }

  renderShareCardTemplate(templateId, renderInput)

  return canvas.toDataURL('image/png')
}
