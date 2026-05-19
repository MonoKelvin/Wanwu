import type { PersonalBackgroundConfig, PersonalBackgroundCrop } from '@shared/types/profile'
import { DEFAULT_BACKGROUND_CONFIG } from '@shared/types/profile'

/** 裁切框相对视口四周留白（px），便于拖拽四角 */
export const CROP_VIEWPORT_INSET_PX = 20

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
    scale: clamp(raw.scale ?? 1, 0.25, 3),
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
      : null
  }
}

export function backgroundLayerStyle(
  config: PersonalBackgroundConfig
): Record<string, string> {
  const c = normalizeBackgroundConfig(config)
  const crop = c.crop
  const clip = crop
    ? `inset(${crop.y * 100}% ${(1 - crop.x - crop.width) * 100}% ${(1 - crop.y - crop.height) * 100}% ${crop.x * 100}%)`
    : 'none'

  return {
    '--ww-personal-bg-scale': String(c.scale),
    '--ww-personal-bg-x': `${c.offsetX}%`,
    '--ww-personal-bg-y': `${c.offsetY}%`,
    '--ww-personal-bg-opacity': String(c.opacity),
    '--ww-personal-bg-clip': clip
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** 使背景图在容器内完整可见时的 scale（与 background-size: calc(100% * scale) 一致） */
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
  return clamp(containerHeight / heightAtScale1, 0.25, 3)
}

export function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('无法加载图片'))
    img.src = url
  })
}

/** 与 CSS background-size: calc(100% * scale) 一致的渲染尺寸 */
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

/** 将指针位移（px）换算为 background-position 偏移量（%） */
export function panOffsetDeltaFromPixels(
  dx: number,
  dy: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  imageWidth: number,
  imageHeight: number
): { offsetX: number; offsetY: number } {
  const { rangeX, rangeY } = computeBackgroundRenderSize(
    viewportWidth,
    viewportHeight,
    scale,
    imageWidth,
    imageHeight
  )
  const panRangeX = rangeX > 0.5 ? rangeX : viewportWidth
  const panRangeY = rangeY > 0.5 ? rangeY : viewportHeight
  return {
    offsetX: (dx * 100) / panRangeX,
    offsetY: (dy * 100) / panRangeY
  }
}

/** 背景图在视口内的可见区域（0–1，相对视口） */
export function computeBackgroundVisibleCrop(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): PersonalBackgroundCrop {
  const { width: bw, height: bh, rangeX, rangeY } = computeBackgroundRenderSize(
    viewportWidth,
    viewportHeight,
    scale,
    imageWidth,
    imageHeight
  )
  const left = (viewportWidth - bw) / 2 - (offsetX / 100) * rangeX
  const top = (viewportHeight - bh) / 2 - (offsetY / 100) * rangeY
  const visLeft = Math.max(0, left)
  const visTop = Math.max(0, top)
  const visRight = Math.min(viewportWidth, left + bw)
  const visBottom = Math.min(viewportHeight, top + bh)
  const w = Math.max(0.05, (visRight - visLeft) / viewportWidth)
  const h = Math.max(0.05, (visBottom - visTop) / viewportHeight)
  return {
    x: clamp(visLeft / viewportWidth, 0, 1 - w),
    y: clamp(visTop / viewportHeight, 0, 1 - h),
    width: w,
    height: h
  }
}

function viewportInsetRegion(
  viewportWidth: number,
  viewportHeight: number,
  insetPx: number
): PersonalBackgroundCrop {
  const mx = insetPx / viewportWidth
  const my = insetPx / viewportHeight
  const width = Math.max(0.05, 1 - 2 * mx)
  const height = Math.max(0.05, 1 - 2 * my)
  return { x: mx, y: my, width, height }
}

function intersectCrops(a: PersonalBackgroundCrop, b: PersonalBackgroundCrop): PersonalBackgroundCrop {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  const width = Math.max(0.05, x2 - x1)
  const height = Math.max(0.05, y2 - y1)
  return { x: x1, y: y1, width, height }
}

/** 裁切框可拖拽区域（图片可见范围 ∩ 视口留白区） */
export function computeCropDragRegion(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  insetPx: number = CROP_VIEWPORT_INSET_PX
): PersonalBackgroundCrop {
  const visible = computeBackgroundVisibleCrop(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const padded =
    insetPx > 0 && viewportWidth > 0 && viewportHeight > 0
      ? viewportInsetRegion(viewportWidth, viewportHeight, insetPx)
      : { x: 0, y: 0, width: 1, height: 1 }
  return intersectCrops(visible, padded)
}

/** 裁切框最大宽高 = min(图片可见范围, 页面 1×1) */
export function computeCropMaxSize(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  const region = computeCropDragRegion(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  return {
    width: Math.min(region.width, 1),
    height: Math.min(region.height, 1)
  }
}

/** 默认裁切框：铺满可拖拽区域内的最大尺寸 */
export function computeDefaultCrop(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): PersonalBackgroundCrop {
  return computeCropDragRegion(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
}

export function clampCropToBounds(
  crop: PersonalBackgroundCrop,
  region: PersonalBackgroundCrop
): PersonalBackgroundCrop {
  const maxSize = {
    width: Math.min(region.width, 1),
    height: Math.min(region.height, 1)
  }
  const width = clamp(crop.width, 0.05, maxSize.width)
  const height = clamp(crop.height, 0.05, maxSize.height)
  const minX = region.x
  const minY = region.y
  const maxX = region.x + region.width - width
  const maxY = region.y + region.height - height
  const x = clamp(crop.x, minX, Math.max(minX, maxX))
  const y = clamp(crop.y, minY, Math.max(minY, maxY))
  return { x, y, width, height }
}

export type CropResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export function resizeCropByCorner(
  start: PersonalBackgroundCrop,
  dx: number,
  dy: number,
  corner: CropResizeHandle,
  bounds: PersonalBackgroundCrop
): PersonalBackgroundCrop {
  let { x, y, width, height } = start
  if (corner === 'se') {
    width += dx
    height += dy
  } else if (corner === 'sw') {
    x += dx
    width -= dx
    height += dy
  } else if (corner === 'ne') {
    y += dy
    width += dx
    height -= dy
  } else {
    x += dx
    y += dy
    width -= dx
    height -= dy
  }
  return clampCropToBounds({ x, y, width, height }, bounds)
}

function backgroundImageRect(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
) {
  const { width: bw, height: bh, rangeX, rangeY } = computeBackgroundRenderSize(
    viewportWidth,
    viewportHeight,
    scale,
    imageWidth,
    imageHeight
  )
  const left = (viewportWidth - bw) / 2 - (offsetX / 100) * rangeX
  const top = (viewportHeight - bh) / 2 - (offsetY / 100) * rangeY
  return { vw: viewportWidth, vh: viewportHeight, bw, bh, left, top, right: left + bw, bottom: top + bh }
}

/** 松手回弹：仅当移出页面超过比例时对齐边沿（参考大图浏览器） */
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
    ox = r.left < 0 ? 100 : -100
  }
  if (outsideY >= snapRatio) {
    oy = r.top < 0 ? 100 : -100
  }

  return {
    offsetX: Math.round(ox),
    offsetY: Math.round(oy)
  }
}

/** 透明度滑块：UI 0–100 ↔ 存储值 0–1 */
export function opacityToUi(opacity: number): number {
  return Math.round(clamp(opacity, 0, 1) * 100)
}

export function opacityFromUi(ui: number): number {
  return clamp(ui, 0, 100) / 100
}
