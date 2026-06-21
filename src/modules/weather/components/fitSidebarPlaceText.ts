import { splitPlaceLabelLines } from '@modules/weather/domain/placeLabel'

export const SIDEBAR_PLACE_MAX_REM = 0.625
export const SIDEBAR_PLACE_MIN_REM = 0.5
const REM_STEP = 0.03125

export interface SidebarPlaceLayout {
  fontSizeRem: number
  lines: string[]
}

export function measureTextWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSizePx: number,
  fontFamily: string,
  fontWeight = '400'
): number {
  ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`
  return ctx.measureText(text).width
}

function fitsSingleLine(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSizePx: number,
  fontFamily: string,
  maxWidthPx: number,
  fontWeight: string
): boolean {
  return measureTextWidth(ctx, text, fontSizePx, fontFamily, fontWeight) <= maxWidthPx
}

function fitsMultiLine(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  fontSizePx: number,
  fontFamily: string,
  maxWidthPx: number,
  fontWeight: string
): boolean {
  return lines.every(
    (line) => measureTextWidth(ctx, line, fontSizePx, fontFamily, fontWeight) <= maxWidthPx
  )
}

/** 将过长单行按字符边界拆成最多两行 */
function splitLongLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontSizePx: number,
  fontFamily: string,
  maxWidthPx: number,
  fontWeight: string
): string[] {
  if (fitsSingleLine(ctx, text, fontSizePx, fontFamily, maxWidthPx, fontWeight)) return [text]
  for (let i = text.length - 1; i > 0; i--) {
    const head = text.slice(0, i)
    const tail = text.slice(i)
    if (
      measureTextWidth(ctx, head, fontSizePx, fontFamily, fontWeight) <= maxWidthPx &&
      measureTextWidth(ctx, tail, fontSizePx, fontFamily, fontWeight) <= maxWidthPx
    ) {
      return [head, tail]
    }
  }
  return [text]
}

/**
 * 侧栏地名排版：在可用宽度内优先单行 + 缩小字号；仍超出则按「·」或字符边界换行。
 */
export function computeSidebarPlaceLayout(
  text: string,
  containerWidthPx: number,
  fontFamily: string,
  rootFontSizePx: number,
  measureCtx: CanvasRenderingContext2D,
  fontWeight = '400'
): SidebarPlaceLayout {
  const label = text.trim()
  if (!label || containerWidthPx <= 0) {
    return { fontSizeRem: SIDEBAR_PLACE_MAX_REM, lines: [label || ''] }
  }

  for (let rem = SIDEBAR_PLACE_MAX_REM; rem >= SIDEBAR_PLACE_MIN_REM - 1e-6; rem -= REM_STEP) {
    const px = rem * rootFontSizePx
    if (fitsSingleLine(measureCtx, label, px, fontFamily, containerWidthPx, fontWeight)) {
      return { fontSizeRem: rem, lines: [label] }
    }
  }

  const dotLines = splitPlaceLabelLines(label)
  if (dotLines.length === 2) {
    for (let rem = SIDEBAR_PLACE_MAX_REM; rem >= SIDEBAR_PLACE_MIN_REM - 1e-6; rem -= REM_STEP) {
      const px = rem * rootFontSizePx
      if (fitsMultiLine(measureCtx, dotLines, px, fontFamily, containerWidthPx, fontWeight)) {
        return { fontSizeRem: rem, lines: dotLines }
      }
    }
    return { fontSizeRem: SIDEBAR_PLACE_MIN_REM, lines: dotLines }
  }

  const minPx = SIDEBAR_PLACE_MIN_REM * rootFontSizePx
  const broken = splitLongLabel(
    measureCtx,
    label,
    minPx,
    fontFamily,
    containerWidthPx,
    fontWeight
  )
  return { fontSizeRem: SIDEBAR_PLACE_MIN_REM, lines: broken.slice(0, 2) }
}
