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
      : null,
    cropSpace: raw.cropSpace
  }
}

/** 渲染后背景图在视口中的像素矩形（与 CSS background-size/position 一致） */
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

/** 图片坐标裁切 → 视口比例（用于 clip-path inset） */
export function imageCropToViewportCrop(
  crop: PersonalBackgroundCrop,
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
  const x1 = r.left + crop.x * r.bw
  const y1 = r.top + crop.y * r.bh
  const x2 = x1 + crop.width * r.bw
  const y2 = y1 + crop.height * r.bh
  const visLeft = Math.max(0, x1)
  const visTop = Math.max(0, y1)
  const visRight = Math.min(r.vw, x2)
  const visBottom = Math.min(r.vh, y2)
  const w = Math.max(0.05, (visRight - visLeft) / r.vw)
  const h = Math.max(0.05, (visBottom - visTop) / r.vh)
  return {
    x: clamp(visLeft / r.vw, 0, 1 - w),
    y: clamp(visTop / r.vh, 0, 1 - h),
    width: w,
    height: h
  }
}

/** 视口比例裁切 → 图片坐标（兼容旧数据） */
export function viewportCropToImageCrop(
  crop: PersonalBackgroundCrop,
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
  const x1 = crop.x * r.vw
  const y1 = crop.y * r.vh
  const x2 = x1 + crop.width * r.vw
  const y2 = y1 + crop.height * r.vh
  return clampCropToBounds(
    {
      x: (x1 - r.left) / r.bw,
      y: (y1 - r.top) / r.bh,
      width: (x2 - x1) / r.bw,
      height: (y2 - y1) / r.bh
    },
    { x: 0, y: 0, width: 1, height: 1 }
  )
}

/** 将配置中的裁切统一为图片坐标系 */
export function migrateConfigCropToImageSpace(
  config: PersonalBackgroundConfig,
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number
): PersonalBackgroundConfig {
  const c = normalizeBackgroundConfig(config)
  if (!c.crop || c.cropSpace === 'image') {
    return { ...c, cropSpace: c.crop ? 'image' : c.cropSpace }
  }
  return {
    ...c,
    crop: viewportCropToImageCrop(
      c.crop,
      viewportWidth,
      viewportHeight,
      c.scale,
      c.offsetX,
      c.offsetY,
      imageWidth,
      imageHeight
    ),
    cropSpace: 'image'
  }
}

export function backgroundLayerStyle(
  config: PersonalBackgroundConfig,
  viewportWidth?: number,
  viewportHeight?: number,
  imageWidth?: number,
  imageHeight?: number
): Record<string, string> {
  const c = normalizeBackgroundConfig(config)
  let clip = 'none'
  if (c.crop) {
    const vpCrop =
      c.cropSpace === 'image' &&
      viewportWidth &&
      viewportHeight &&
      imageWidth &&
      imageHeight
        ? imageCropToViewportCrop(
            c.crop,
            viewportWidth,
            viewportHeight,
            c.scale,
            c.offsetX,
            c.offsetY,
            imageWidth,
            imageHeight
          )
        : c.crop
    clip = `inset(${vpCrop.y * 100}% ${(1 - vpCrop.x - vpCrop.width) * 100}% ${(1 - vpCrop.y - vpCrop.height) * 100}% ${vpCrop.x * 100}%)`
  }

  return {
    '--ww-personal-bg-scale': String(c.scale),
    '--ww-personal-bg-x': `${c.offsetX}%`,
    '--ww-personal-bg-y': `${c.offsetY}%`,
    '--ww-personal-bg-opacity': String(c.opacity),
    '--ww-personal-bg-clip': clip
  }
}

/** 图片坐标裁切框 → 编辑器 overlay 用的视口百分比样式 */
export function imageCropToViewportStyle(
  crop: PersonalBackgroundCrop,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): { left: string; top: string; width: string; height: string } {
  const r = backgroundImageRect(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const left = r.left + crop.x * r.bw
  const top = r.top + crop.y * r.bh
  const width = crop.width * r.bw
  const height = crop.height * r.bh
  return {
    left: `${(left / r.vw) * 100}%`,
    top: `${(top / r.vh) * 100}%`,
    width: `${(width / r.vw) * 100}%`,
    height: `${(height / r.vh) * 100}%`
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
  if (r.bw <= 0.5 || r.bh <= 0.5) return { dx: 0, dy: 0 }
  return {
    dx: (dxNorm * viewportWidth) / r.bw,
    dy: (dyNorm * viewportHeight) / r.bh
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
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

function viewportInsetToImageRegion(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  insetPx: number
): PersonalBackgroundCrop {
  const mx = insetPx / viewportWidth
  const my = insetPx / viewportHeight
  const padded = { x: mx, y: my, width: 1 - 2 * mx, height: 1 - 2 * my }
  const vpCrop = {
    x: padded.x * viewportWidth,
    y: padded.y * viewportHeight,
    width: padded.width * viewportWidth,
    height: padded.height * viewportHeight
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
  return viewportCropToImageCrop(
    {
      x: vpCrop.x / viewportWidth,
      y: vpCrop.y / viewportHeight,
      width: vpCrop.width / viewportWidth,
      height: vpCrop.height / viewportHeight
    },
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
}

function intersectCrops(a: PersonalBackgroundCrop, b: PersonalBackgroundCrop): PersonalBackgroundCrop {
  const x1 = Math.max(a.x, b.x)
  const y1 = Math.max(a.y, b.y)
  const x2 = Math.min(a.x + a.width, b.x + b.width)
  const y2 = Math.min(a.y + a.height, b.y + b.height)
  if (x2 <= x1 || y2 <= y1) {
    return { x: x1, y: y1, width: 0.05, height: 0.05 }
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}

/** 裁切框可拖拽区域（图片坐标，随 scale/offset 变化） */
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
  const visible = computeImageVisibleRegion(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const fullImage = { x: 0, y: 0, width: 1, height: 1 }
  let region = intersectCrops(visible, fullImage)
  if (insetPx > 0 && viewportWidth > 0 && viewportHeight > 0) {
    const padded = viewportInsetToImageRegion(
      viewportWidth,
      viewportHeight,
      scale,
      offsetX,
      offsetY,
      imageWidth,
      imageHeight,
      insetPx
    )
    region = intersectCrops(region, padded)
  }
  return {
    x: region.x,
    y: region.y,
    width: Math.max(0.05, region.width),
    height: Math.max(0.05, region.height)
  }
}

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
  return { width: region.width, height: region.height }
}

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
  const width = clamp(crop.width, 0.05, region.width)
  const height = clamp(crop.height, 0.05, region.height)
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

  return {
    offsetX: Math.round(ox),
    offsetY: Math.round(oy)
  }
}

export function opacityToUi(opacity: number): number {
  return Math.round(clamp(opacity, 0, 1) * 100)
}

export function opacityFromUi(ui: number): number {
  return clamp(ui, 0, 100) / 100
}
