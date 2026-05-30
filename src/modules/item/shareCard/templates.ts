import type { ShareCardStyle } from './styleCatalog'
import { resolveShareCardStyle } from './styleCatalog'
import type { ShareCardFilterId } from './imageFilters'
import { canvasFilterCss } from './imageFilters'
import type { ShareCardContent, ShareCardPalette, ShareCardTemplateId } from './types'
import { FONT_STACK, SHARE_CARD_HEIGHT, SHARE_CARD_WIDTH } from './types'
import { typographyScale } from './extractImagePalette'
import {
  drawBrandMark,
  drawCoverImage,
  drawPlaceholder,
  drawShadowedText,
  drawTextBlock,
  drawVerticalGradient,
  drawVignette,
  measureTextBlockHeight,
  verticalCenterStartY,
  wrapText
} from './canvasUtils'

export interface TemplateRenderInput {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  content: ShareCardContent
  palette: ShareCardPalette
  image: HTMLImageElement | null
  cardStyle?: ShareCardStyle
  useCustomStyle?: boolean
  filterId?: ShareCardFilterId
}

const PAD = 56

function drawSceneBackground(input: TemplateRenderInput) {
  const { ctx, width, height, image, filterId = 'none' } = input
  if (image) drawCoverImage(ctx, image, width, height, filterId)
  else drawPlaceholder(ctx, width, height)
}

function drawSceneBackgroundTop(
  input: TemplateRenderInput,
  topRatio: number,
  panelColor = '#f4f4f5'
) {
  const { ctx, width, height, image, filterId = 'none' } = input
  const topH = height * topRatio

  ctx.fillStyle = panelColor
  ctx.fillRect(0, topH, width, height - topH)

  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, topH)
  ctx.clip()

  if (image) {
    const scale = Math.max(width / image.width, topH / image.height)
    const dw = image.width * scale
    const dh = image.height * scale
    const dx = (width - dw) / 2
    const dy = (topH - dh) / 2
    const css = canvasFilterCss(filterId)
    if (css === 'none') {
      ctx.drawImage(image, dx, dy, dw, dh)
    } else {
      const prev = ctx.filter
      ctx.filter = css
      ctx.drawImage(image, dx, dy, dw, dh)
      ctx.filter = prev
    }
  } else {
    drawPlaceholder(ctx, width, topH)
  }

  ctx.restore()
}

function resolveStyle(input: TemplateRenderInput) {
  return resolveShareCardStyle(
    input.palette,
    input.width,
    input.cardStyle,
    input.useCustomStyle ?? false
  )
}

function renderClassic(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK

  drawSceneBackground(input)

  drawVerticalGradient(ctx, width, height * 0.42, height * 0.58, palette.scrimFrom, palette.scrimTo)
  drawBrandMark(ctx, PAD, PAD + 8, palette, type.brand, 'left', fontStack)

  const lineGap = styled.useCustom ? styled.type.lineGap : { title: 56, summary: 36, highlight: 32 }
  const maxWidth = width - PAD * 2
  const blockH = measureTextBlockHeight({
    ctx,
    maxWidth,
    content,
    titleSize: type.title,
    summarySize: type.summary,
    highlightSize: type.highlight,
    fontStack,
    lineGap
  })

  drawTextBlock({
    ctx,
    x: PAD,
    y: height - PAD - blockH + 40,
    maxWidth,
    content,
    palette,
    titleSize: type.title,
    summarySize: type.summary,
    highlightSize: type.highlight,
    fontStack,
    lineGap
  })
}

function renderCenter(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK
  const lineGap = styled.useCustom
    ? styled.type.lineGap
    : { title: 54, summary: 36, highlight: 32 }

  drawSceneBackground(input)

  drawVignette(ctx, width, height, 0.22)

  const maxWidth = width - PAD * 2.5
  const blockH = measureTextBlockHeight({
    ctx,
    maxWidth,
    content,
    titleSize: type.title,
    summarySize: type.summary,
    highlightSize: type.highlight,
    fontStack,
    lineGap
  })

  const startY = verticalCenterStartY(ctx, height, blockH, type.title, fontStack)

  drawTextBlock({
    ctx,
    x: width / 2,
    y: startY,
    maxWidth,
    content,
    palette,
    titleSize: styled.useCustom ? type.title : type.title.replace('52', '48'),
    summarySize: type.summary,
    highlightSize: type.highlight,
    fontStack,
    lineGap,
    textShadow: true,
    textAlign: 'center'
  })

  drawBrandMark(
    ctx,
    width / 2,
    height - PAD,
    palette,
    styled.useCustom ? type.brand : `500 ${Math.round(20 * (width / 1080))}px`,
    'center',
    fontStack
  )
}

function renderCorner(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK
  const lineGap = styled.useCustom
    ? styled.type.lineGap
    : { title: 50, summary: 34, highlight: 30 }
  const cornerW = width * 0.44
  const lightBg = styled.lightBg

  drawSceneBackground(input)

  drawVignette(ctx, width, height, 0.3)

  ctx.textBaseline = 'alphabetic'

  const titleSize = styled.useCustom ? type.title : type.title.replace('52', '44')
  ctx.font = `${titleSize} ${fontStack}`
  let ty = PAD + 52
  for (const line of wrapText(ctx, content.title, cornerW, 2)) {
    drawShadowedText(ctx, line, PAD, ty, palette.textPrimary, 'left', lightBg)
    ty += styled.useCustom ? lineGap.title - 4 : 50
  }

  drawBrandMark(
    ctx,
    width - PAD,
    PAD + 8,
    { ...palette, textSecondary: palette.textPrimary },
    type.brand,
    'right',
    fontStack
  )

  if (content.highlights.length) {
    ctx.font = `${type.highlight} ${fontStack}`
    let hy = height - PAD
    for (const h of [...content.highlights].reverse()) {
      drawShadowedText(ctx, `\u00b7 ${h}`, PAD, hy, palette.textSecondary, 'left', lightBg)
      hy -= styled.useCustom ? lineGap.highlight : 34
    }
  }

  if (content.summaryLines.length) {
    const summarySize = styled.useCustom ? type.summary : type.summary.replace('28', '26')
    ctx.font = `${summarySize} ${fontStack}`
    let sy = height - PAD
    for (const line of [...content.summaryLines].reverse()) {
      drawShadowedText(ctx, line, width - PAD, sy, palette.textSecondary, 'right', lightBg)
      sy -= styled.useCustom ? lineGap.summary : 36
    }
  }

  ctx.textAlign = 'left'
}

function renderVivid(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK
  const lineGap = styled.useCustom
    ? styled.type.lineGap
    : { title: 58, summary: 38, highlight: 34 }

  drawSceneBackground(input)

  const accentLine = palette.accentRgb
  ctx.strokeStyle = `rgba(${accentLine[0]}, ${accentLine[1]}, ${accentLine[2]}, 0.85)`
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(PAD, height * 0.38)
  ctx.lineTo(PAD + 72, height * 0.38)
  ctx.stroke()

  ctx.textAlign = 'left'
  ctx.font = `${type.title} ${fontStack}`
  const titleLines = wrapText(ctx, content.title, width - PAD * 2, 2)
  let cy = height * 0.42
  for (const line of titleLines) {
    ctx.fillStyle = palette.textPrimary
    ctx.fillText(line, PAD, cy)
    cy += styled.useCustom ? lineGap.title : 58
  }

  cy += 12
  if (content.summaryLines.length) {
    ctx.fillStyle = palette.textSecondary
    ctx.font = `${type.summary} ${fontStack}`
    for (const line of content.summaryLines) {
      ctx.fillText(line, PAD, cy)
      cy += styled.useCustom ? lineGap.summary : 38
    }
  }

  if (content.highlights.length) {
    cy += 16
    ctx.font = `${type.highlight} ${fontStack}`
    for (const h of content.highlights) {
      ctx.fillStyle = palette.textSecondary
      ctx.fillText(h, PAD, cy)
      cy += styled.useCustom ? lineGap.highlight : 34
    }
  }

  drawBrandMark(ctx, width - PAD, PAD + 8, palette, type.brand, 'right', fontStack)
}

function renderCinema(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK
  const lineGap = styled.useCustom
    ? styled.type.lineGap
    : { title: 64, summary: 36, highlight: 32 }
  const titleCinema = type.titleCinema
  const summarySize = styled.useCustom ? type.summary : type.summary.replace('28', '26')

  drawSceneBackground(input)

  drawVignette(ctx, width, height, 0.52)
  drawVerticalGradient(
    ctx,
    width,
    height * 0.55,
    height * 0.45,
    'rgba(0,0,0,0)',
    'rgba(0,0,0,0.75)'
  )

  ctx.textAlign = 'center'
  ctx.fillStyle = styled.useCustom ? palette.textPrimary : '#ffffff'
  ctx.font = `${titleCinema} ${fontStack}`
  const titleLines = wrapText(ctx, content.title, width - PAD * 2, 2)
  let cy = height - PAD - 80
  for (let i = titleLines.length - 1; i >= 0; i--) {
    ctx.fillText(titleLines[i], width / 2, cy)
    cy -= styled.useCustom ? lineGap.title + 8 : 64
  }

  cy = height - PAD - 24
  if (content.summaryLines[0]) {
    ctx.fillStyle = styled.useCustom ? palette.textSecondary : 'rgba(255,255,255,0.78)'
    ctx.font = `${summarySize} ${fontStack}`
    ctx.fillText(content.summaryLines[0], width / 2, cy)
  }

  ctx.textAlign = 'left'
  const brandPalette = styled.useCustom
    ? palette
    : { ...palette, textSecondary: 'rgba(255,255,255,0.7)' }
  drawBrandMark(ctx, PAD, PAD + 8, brandPalette, type.brand, 'left', fontStack)
}

function renderMinimal(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK
  const lightBg = styled.lightBg

  drawSceneBackground(input)

  drawVerticalGradient(ctx, width, 0, height * 0.28, palette.scrimTo, palette.scrimFrom)
  drawVerticalGradient(ctx, width, height * 0.78, height * 0.22, palette.scrimFrom, palette.scrimTo)

  ctx.textBaseline = 'alphabetic'

  const titleSize = styled.useCustom ? type.title : type.title.replace('52', '46')
  ctx.font = `${titleSize} ${fontStack}`
  let ty = PAD + 52
  for (const line of wrapText(ctx, content.title, width - PAD * 2, 2)) {
    drawShadowedText(ctx, line, PAD, ty, palette.textPrimary, 'left', lightBg)
    ty += styled.useCustom ? styled.type.lineGap.title - 6 : 48
  }

  drawBrandMark(ctx, width - PAD, PAD + 8, palette, type.brand, 'right', fontStack)

  if (content.summaryLines[0]) {
    const summarySize = styled.useCustom ? type.summary : type.summary.replace('28', '26')
    ctx.font = `${summarySize} ${fontStack}`
    drawShadowedText(
      ctx,
      content.summaryLines[0],
      width / 2,
      height - PAD,
      palette.textSecondary,
      'center',
      lightBg
    )
  }

  ctx.textAlign = 'left'
}

function renderSplit(input: TemplateRenderInput) {
  const { ctx, width, height, content } = input
  const styled = resolveStyle(input)
  const type = styled.useCustom ? styled.type : typographyScale(width)
  const palette = styled.palette
  const fontStack = styled.useCustom ? styled.fontStack : FONT_STACK
  const lineGap = styled.useCustom ? styled.type.lineGap : { title: 50, summary: 34, highlight: 30 }
  const splitY = height * 0.58

  drawSceneBackgroundTop(input, 0.58)

  const panelPalette: ShareCardPalette = styled.useCustom
    ? palette
    : {
        ...palette,
        textPrimary: '#121214',
        textSecondary: 'rgba(18, 18, 22, 0.68)',
        isDark: false
      }

  const maxWidth = width - PAD * 2
  const blockH = measureTextBlockHeight({
    ctx,
    maxWidth,
    content: {
      ...content,
      highlights: content.highlights.slice(0, 2)
    },
    titleSize: styled.useCustom ? type.title : type.title.replace('52', '44'),
    summarySize: type.summary,
    highlightSize: type.highlight,
    fontStack,
    lineGap
  })

  drawTextBlock({
    ctx,
    x: PAD,
    y: splitY + (height - splitY - blockH) / 2 + 8,
    maxWidth,
    content: {
      ...content,
      highlights: content.highlights.slice(0, 2)
    },
    palette: panelPalette,
    titleSize: styled.useCustom ? type.title : type.title.replace('52', '44'),
    summarySize: type.summary,
    highlightSize: type.highlight,
    fontStack,
    lineGap
  })

  drawBrandMark(
    ctx,
    width - PAD,
    splitY + 36,
    { ...panelPalette, textSecondary: 'rgba(18, 18, 22, 0.45)' },
    type.brand,
    'right',
    fontStack
  )
}

const RENDERERS: Record<ShareCardTemplateId, (input: TemplateRenderInput) => void> = {
  classic: renderClassic,
  center: renderCenter,
  corner: renderCorner,
  vivid: renderVivid,
  cinema: renderCinema,
  minimal: renderMinimal,
  split: renderSplit
}

export function renderShareCardTemplate(templateId: ShareCardTemplateId, input: TemplateRenderInput) {
  RENDERERS[templateId](input)
}

export { SHARE_CARD_WIDTH, SHARE_CARD_HEIGHT }
