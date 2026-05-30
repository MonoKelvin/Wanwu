import type { ShareCardFilterId } from './imageFilters'
import { canvasFilterCss } from './imageFilters'
import type { ShareCardContent, ShareCardPalette } from './types'
import { FONT_STACK } from './types'

async function resolveImageSrc(url: string): Promise<{ src: string; revoke?: () => void }> {
  if (/^wanwu-media:\/\//i.test(url)) {
    const res = await fetch(url)
    if (!res.ok) throw new Error('image_load_failed')
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    return { src: blobUrl, revoke: () => URL.revokeObjectURL(blobUrl) }
  }
  return { src: url }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    void (async () => {
      let revoke: (() => void) | undefined
      try {
        const resolved = await resolveImageSrc(url)
        revoke = resolved.revoke
        const img = new Image()
        if (/^https?:\/\//i.test(url)) img.crossOrigin = 'anonymous'
        img.onload = () => {
          revoke?.()
          resolve(img)
        }
        img.onerror = () => {
          revoke?.()
          reject(new Error('image_load_failed'))
        }
        img.src = resolved.src
      } catch {
        revoke?.()
        reject(new Error('image_load_failed'))
      }
    })()
  })
}

export function drawShadowedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = 'left',
  lightBg = false
) {
  const prev = ctx.textAlign
  ctx.textAlign = align
  ctx.fillStyle = lightBg ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.55)'
  ctx.fillText(text, x + 1, y + 2)
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
  ctx.textAlign = prev
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

export function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  width: number,
  height: number,
  filterId: ShareCardFilterId = 'none'
) {
  const scale = Math.max(width / img.width, height / img.height)
  const dw = img.width * scale
  const dh = img.height * scale
  const dx = (width - dw) / 2
  const dy = (height - dh) / 2
  const css = canvasFilterCss(filterId)
  if (css === 'none') {
    ctx.drawImage(img, dx, dy, dw, dh)
    return
  }
  const prev = ctx.filter
  ctx.filter = css
  ctx.drawImage(img, dx, dy, dw, dh)
  ctx.filter = prev
}

export function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) {
  const g = ctx.createLinearGradient(0, 0, width, height)
  g.addColorStop(0, '#ececee')
  g.addColorStop(0.5, '#f5f5f6')
  g.addColorStop(1, '#e0e0e4')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
): string[] {
  const chars = Array.from(text)
  const lines: string[] = []
  let line = ''
  for (const ch of chars) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length >= maxLines) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines) {
    const joined = lines.join('')
    if (joined.length < text.length) {
      const last = lines[maxLines - 1]
      lines[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : `${last}…`
    }
  }
  return lines.length ? lines : [text]
}

export function drawVerticalGradient(
  ctx: CanvasRenderingContext2D,
  width: number,
  y: number,
  height: number,
  from: string,
  to: string
) {
  const g = ctx.createLinearGradient(0, y, 0, y + height)
  g.addColorStop(0, from)
  g.addColorStop(1, to)
  ctx.fillStyle = g
  ctx.fillRect(0, y, width, height)
}

export function measureTextBlockHeight(options: {
  ctx: CanvasRenderingContext2D
  maxWidth: number
  content: ShareCardContent
  titleSize: string
  summarySize: string
  highlightSize: string
  fontStack?: string
  lineGap?: { title: number; summary: number; highlight: number }
}): number {
  const {
    ctx,
    maxWidth,
    content,
    titleSize,
    summarySize,
    highlightSize,
    fontStack = FONT_STACK,
    lineGap = { title: 58, summary: 38, highlight: 34 }
  } = options

  let h = 0
  ctx.font = `${titleSize} ${fontStack}`
  h += wrapText(ctx, content.title, maxWidth, 2).length * lineGap.title
  h += 8

  if (content.summaryLines.length) {
    ctx.font = `${summarySize} ${fontStack}`
    h += content.summaryLines.length * lineGap.summary
  }

  if (content.highlights.length) {
    h += 12
    h += content.highlights.length * lineGap.highlight
  }

  return h
}

export function verticalCenterStartY(
  ctx: CanvasRenderingContext2D,
  height: number,
  blockH: number,
  titleFont: string,
  fontStack: string
): number {
  ctx.font = `${titleFont} ${fontStack}`
  const m = ctx.measureText('\u7269')
  const ascent = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent ?? 36
  return (height - blockH) / 2 + ascent
}

export function drawTextBlock(options: {
  ctx: CanvasRenderingContext2D
  x: number
  y: number
  maxWidth: number
  content: ShareCardContent
  palette: ShareCardPalette
  titleSize: string
  summarySize: string
  highlightSize: string
  fontStack?: string
  lineGap?: { title: number; summary: number; highlight: number }
  textShadow?: boolean
  textAlign?: CanvasTextAlign
}) {
  const {
    ctx,
    x,
    y,
    maxWidth,
    content,
    palette,
    titleSize,
    summarySize,
    highlightSize,
    fontStack = FONT_STACK,
    lineGap = { title: 58, summary: 38, highlight: 34 },
    textShadow = false,
    textAlign = 'left'
  } = options

  const write = (text: string, tx: number, ty: number, color: string) => {
    if (textShadow) drawShadowedText(ctx, text, tx, ty, color, textAlign, !palette.isDark)
    else {
      ctx.fillStyle = color
      ctx.fillText(text, tx, ty)
    }
  }

  let cy = y
  ctx.textAlign = textAlign
  ctx.textBaseline = 'alphabetic'

  ctx.font = `${titleSize} ${fontStack}`
  const titleLines = wrapText(ctx, content.title, maxWidth, 2)
  for (const line of titleLines) {
    write(line, x, cy, palette.textPrimary)
    cy += lineGap.title
  }

  cy += 8
  if (content.summaryLines.length) {
    ctx.font = `${summarySize} ${fontStack}`
    for (const line of content.summaryLines) {
      write(line, x, cy, palette.textSecondary)
      cy += lineGap.summary
    }
  }

  if (content.highlights.length) {
    cy += 12
    ctx.font = `${highlightSize} ${fontStack}`
    for (const h of content.highlights) {
      write(`· ${h}`, x, cy, palette.textSecondary)
      cy += lineGap.highlight
    }
  }

  ctx.textAlign = 'left'
  return cy
}

export function drawBrandMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  palette: ShareCardPalette,
  brandSize: string,
  align: 'left' | 'right' | 'center' = 'left',
  fontStack: string = FONT_STACK
) {
  ctx.textAlign = align
  ctx.fillStyle = palette.textSecondary
  ctx.font = `${brandSize} ${fontStack}`
  ctx.fillText('\u4e07\u7269Wanwu', x, y)
  ctx.textAlign = 'left'
}

export function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number, strength = 0.45) {
  const g = ctx.createRadialGradient(
    width / 2,
    height * 0.45,
    height * 0.2,
    width / 2,
    height * 0.45,
    height * 0.85
  )
  g.addColorStop(0, `rgba(0,0,0,0)`)
  g.addColorStop(1, `rgba(0,0,0,${strength})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, width, height)
}
