import type { PersonalBackgroundConfig, PersonalBackgroundCrop } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'
import {
  BACKGROUND_SCALE_MIN,
  BACKGROUND_SCALE_MAX,
  BACKGROUND_SNAP_OUTSIDE_RATIO,
  clamp
} from './constants'

export function toWanwuMediaUrl(
  relativePath: string | null | undefined,
  cacheKey?: number | string
): string | null {
  const rel = relativePath?.trim()
  if (!rel) return null
  const normalized = rel.replace(/^\/+/, '').replace(/\\/g, '/')
  const base = `wanwu-media://${encodeURI(normalized)}`
  if (cacheKey === undefined || cacheKey === '') return base
  return `${base}?v=${encodeURIComponent(String(cacheKey))}`
}

export function normalizeBackgroundConfig(
  raw: PersonalBackgroundConfig | null | undefined
): PersonalBackgroundConfig {
  if (!raw) return { ...DEFAULT_BACKGROUND_CONFIG }
  return {
    scale: clamp(raw.scale ?? 1, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX),
    offsetX: raw.offsetX ?? 0,
    offsetY: raw.offsetY ?? 0,
    opacity: clamp(raw.opacity ?? DEFAULT_BACKGROUND_CONFIG.opacity, 0, 1),
    crop: raw.crop
      ? {
          x: clamp(raw.crop.x, 0, 0.95),
          y: clamp(raw.crop.y, 0, 0.95),
          width: clamp(raw.crop.width, 0.05, 1),
          height: clamp(raw.crop.height, 0.05, 1)
        }
      : null,
    cropSpace: raw.cropSpace
  }
}

/** IPC 需可 structured clone 的纯对象，避免 Vue 响应式代理导致克隆失败 */
export function profileConfigForIpc(
  config: PersonalBackgroundConfig | null | undefined
): Record<string, unknown> | null {
  if (!config) return null
  return JSON.parse(JSON.stringify(normalizeBackgroundConfig(config))) as Record<string, unknown>
}

export function backgroundImageRect(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
) {
  const { width: bw, height: bh } = computeBackgroundRenderSize(
    viewportWidth,
    viewportHeight,
    scale,
    imageWidth,
    imageHeight
  )
  const left = (0.5 + offsetX / 100) * (viewportWidth - bw)
  const top = (0.5 + offsetY / 100) * (viewportHeight - bh)
  return {
    vw: viewportWidth,
    vh: viewportHeight,
    bw,
    bh,
    left,
    top,
    right: left + bw,
    bottom: top + bh
  }
}

/** 视口归一化指针位移 → 图片坐标裁切增量 */
export function viewportNormDeltaToImageCrop(
  dxNorm: number,
  dyNorm: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): { dx: number; dy: number } {
  const r = backgroundImageRect(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  if (r.bw < 1 || r.bh < 1) return { dx: 0, dy: 0 }
  return {
    dx: (dxNorm * viewportWidth) / r.bw,
    dy: (dyNorm * viewportHeight) / r.bh
  }
}

export function computeBackgroundFitScale(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): number {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return 1
  }
  const ratio = imageWidth / imageHeight
  const heightAtScale1 = containerWidth / ratio
  if (heightAtScale1 <= containerHeight) return 1
  return clamp(containerHeight / heightAtScale1, BACKGROUND_SCALE_MIN, BACKGROUND_SCALE_MAX)
}

export function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('无法加载图片'))
    img.src = url
  })
}

export function computeBackgroundRenderSize(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  imageWidth: number,
  imageHeight: number
): { width: number; height: number; rangeX: number; rangeY: number } {
  const width = viewportWidth * scale
  const height = width * (imageHeight / imageWidth)
  return {
    width,
    height,
    rangeX: Math.abs(width - viewportWidth),
    rangeY: Math.abs(height - viewportHeight)
  }
}

export function panOffsetDeltaFromPixels(
  dx: number,
  dy: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  imageWidth: number,
  imageHeight: number
): { offsetX: number; offsetY: number } {
  const { width: bw, height: bh } = computeBackgroundRenderSize(
    viewportWidth,
    viewportHeight,
    scale,
    imageWidth,
    imageHeight
  )
  const spanX = Math.abs(viewportWidth - bw) > 0.5 ? viewportWidth - bw : viewportWidth
  const spanY = Math.abs(viewportHeight - bh) > 0.5 ? viewportHeight - bh : viewportHeight
  return {
    offsetX: (dx * 100) / spanX,
    offsetY: (dy * 100) / spanY
  }
}

/** 图片在视口内可见部分（图片坐标 0–1） */
export function computeImageVisibleRegion(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): PersonalBackgroundCrop {
  const r = backgroundImageRect(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const visLeft = Math.max(0, r.left)
  const visTop = Math.max(0, r.top)
  const visRight = Math.min(r.vw, r.right)
  const visBottom = Math.min(r.vh, r.bottom)
  if (r.bw <= 0.5 || r.bh <= 0.5) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
  const x = clamp((visLeft - r.left) / r.bw, 0, 1)
  const y = clamp((visTop - r.top) / r.bh, 0, 1)
  return {
    x,
    y,
    width: clamp((visRight - visLeft) / r.bw, 0.05, 1 - x),
    height: clamp((visBottom - visTop) / r.bh, 0.05, 1 - y)
  }
}

export function resolveBackgroundOffset(
  offsetX: number,
  offsetY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
  opts?: { allowSnap?: boolean; snapRatio?: number }
): { offsetX: number; offsetY: number } {
  const snapRatio = opts?.snapRatio ?? 0.9

  if (!opts?.allowSnap) {
    return { offsetX, offsetY }
  }

  const r = backgroundImageRect(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )

  let ox = offsetX
  let oy = offsetY

  const outsideX =
    r.left < 0
      ? Math.min(1, -r.left / r.bw)
      : r.right > r.vw
        ? Math.min(1, (r.right - r.vw) / r.bw)
        : 0
  const outsideY =
    r.top < 0
      ? Math.min(1, -r.top / r.bh)
      : r.bottom > r.vh
        ? Math.min(1, (r.bottom - r.vh) / r.bh)
        : 0

  if (outsideX >= snapRatio) {
    const targetLeft = r.left < 0 ? 0 : r.vw - r.bw
    ox = (targetLeft / (r.vw - r.bw) - 0.5) * 100
  }
  if (outsideY >= snapRatio) {
    const targetTop = r.top < 0 ? 0 : r.vh - r.bh
    oy = (targetTop / (r.vh - r.bh) - 0.5) * 100
  }

  return { offsetX: ox, offsetY: oy }
}

/** 是否需按 90% 超出规则回弹背景位置 */
export function backgroundOffsetNeedsSnap(
  offsetX: number,
  offsetY: number,
  scale: number,
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number,
  snapRatio: number = BACKGROUND_SNAP_OUTSIDE_RATIO
): boolean {
  const resolved = resolveBackgroundOffset(
    offsetX,
    offsetY,
    scale,
    viewportWidth,
    viewportHeight,
    imageWidth,
    imageHeight,
    { allowSnap: true, snapRatio }
  )
  return (
    Math.abs(resolved.offsetX - offsetX) > 0.02 ||
    Math.abs(resolved.offsetY - offsetY) > 0.02
  )
}

export function opacityToUi(opacity: number): number {
  return Math.round(clamp(opacity, 0, 1) * 100)
}

export function opacityFromUi(ui: number): number {
  return clamp(ui, 0, 100) / 100
}
