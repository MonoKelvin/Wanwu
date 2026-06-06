import type { PersonalBackgroundConfig, PersonalBackgroundCrop } from '@shared/types/profile'
import {
  BACKGROUND_SCALE_MIN,
  BACKGROUND_SCALE_MAX,
  CROP_VIEWPORT_INSET_PX,
  clamp
} from './constants'
import {
  backgroundImageRect,
  computeBackgroundRenderSize,
  computeImageVisibleRegion,
  normalizeBackgroundConfig,
  panOffsetDeltaFromPixels
} from './core'

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

/** 裁切框必须落在页面视口内时可用的范围（图片坐标） */
export function computeCropViewportClampRegion(
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
  if (r.bw < 1 || r.bh < 1) {
    return { x: 0, y: 0, width: 1, height: 1 }
  }
  const minX = clamp(-r.left / r.bw, 0, 1)
  const minY = clamp(-r.top / r.bh, 0, 1)
  const maxX = clamp((r.vw - r.left) / r.bw, minX + 0.05, 1)
  const maxY = clamp((r.vh - r.top) / r.bh, minY + 0.05, 1)
  return {
    x: minX,
    y: minY,
    width: Math.max(0.05, maxX - minX),
    height: Math.max(0.05, maxY - minY)
  }
}

/** 裁切框可拖拽区域（图片坐标：视口内 ∩ 图片可见部分） */
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
  const viewportClamp = computeCropViewportClampRegion(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const fullImage = { x: 0, y: 0, width: 1, height: 1 }
  let region = intersectCrops(intersectCrops(visible, fullImage), viewportClamp)
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
    const withInset = intersectCrops(region, padded)
    if (withInset.width >= 0.05 && withInset.height >= 0.05) {
      region = withInset
    }
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

/** 将裁切框限制在可拖拽区域内（缩放后图片变小时会收缩裁切框） */
export function fitCropToCropDragRegion(
  crop: PersonalBackgroundCrop,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number
): PersonalBackgroundCrop {
  const region = computeCropDragRegion(
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  return clampCropToBounds(crop, region)
}

/** 以视口内某点为中心缩放背景（保持该点下的图片内容不动） */
export function scaleBackgroundAboutViewportPoint(
  oldScale: number,
  newScale: number,
  offsetX: number,
  offsetY: number,
  focalViewportX: number,
  focalViewportY: number,
  viewportWidth: number,
  viewportHeight: number,
  imageWidth: number,
  imageHeight: number
): { scale: number; offsetX: number; offsetY: number } {
  const r0 = backgroundImageRect(
    viewportWidth,
    viewportHeight,
    oldScale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const bw1 = viewportWidth * newScale
  const bh1 = bw1 * (imageHeight / imageWidth)

  let fx = 0.5
  let fy = 0.5
  if (r0.bw >= 1 && r0.bh >= 1) {
    fx = clamp((focalViewportX - r0.left) / r0.bw, 0, 1)
    fy = clamp((focalViewportY - r0.top) / r0.bh, 0, 1)
  }

  const left1 = focalViewportX - fx * bw1
  const top1 = focalViewportY - fy * bh1
  const spanX = viewportWidth - bw1
  const spanY = viewportHeight - bh1

  let ox = 0
  let oy = 0
  if (Math.abs(spanX) > 0.5) {
    ox = (left1 / spanX - 0.5) * 100
  }
  if (Math.abs(spanY) > 0.5) {
    oy = (top1 / spanY - 0.5) * 100
  }

  return { scale: newScale, offsetX: ox, offsetY: oy }
}

/** 以视口内某点为中心缩放裁切框（视口比例 → 图片坐标） */
export function scaleImageCropAboutViewportPoint(
  crop: PersonalBackgroundCrop,
  factor: number,
  focalViewportX: number,
  focalViewportY: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number,
  imageWidth: number,
  imageHeight: number,
  bounds?: PersonalBackgroundCrop
): PersonalBackgroundCrop {
  const vpCrop = imageCropToViewportCrop(
    crop,
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  const fx = clamp(focalViewportX / viewportWidth, 0, 1)
  const fy = clamp(focalViewportY / viewportHeight, 0, 1)
  const newW = clamp(vpCrop.width * factor, 0.05, 1)
  const newH = clamp(vpCrop.height * factor, 0.05, 1)
  const ratioW = vpCrop.width > 1e-6 ? newW / vpCrop.width : 1
  const ratioH = vpCrop.height > 1e-6 ? newH / vpCrop.height : 1
  const newX = fx - (fx - vpCrop.x) * ratioW
  const newY = fy - (fy - vpCrop.y) * ratioH
  const vpBounds = { x: 0, y: 0, width: 1, height: 1 }
  const clampedVp = clampCropToBounds(
    { x: newX, y: newY, width: newW, height: newH },
    vpBounds
  )
  let result = viewportCropToImageCrop(
    clampedVp,
    viewportWidth,
    viewportHeight,
    scale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  if (bounds) {
    result = clampCropToBounds(result, bounds)
  }
  return result
}

/** 缩放背景时保持裁切框在视口中的位置与大小不变（仅更新图片坐标） */
export function preserveImageCropViewportOnScaleChange(
  crop: PersonalBackgroundCrop,
  viewportWidth: number,
  viewportHeight: number,
  offsetX: number,
  offsetY: number,
  oldScale: number,
  newScale: number,
  imageWidth: number,
  imageHeight: number
): PersonalBackgroundCrop {
  if (oldScale === newScale) return crop
  const vpCrop = imageCropToViewportCrop(
    crop,
    viewportWidth,
    viewportHeight,
    oldScale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
  return viewportCropToImageCrop(
    vpCrop,
    viewportWidth,
    viewportHeight,
    newScale,
    offsetX,
    offsetY,
    imageWidth,
    imageHeight
  )
}

export type CropResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

/** 拖拽四角缩放裁切框，固定对角锚点，避免 clamp 时两侧同时位移 */
export function resizeCropByCorner(
  start: PersonalBackgroundCrop,
  dx: number,
  dy: number,
  corner: CropResizeHandle,
  bounds: PersonalBackgroundCrop
): PersonalBackgroundCrop {
  const minW = 0.05
  const minH = 0.05
  const bx1 = bounds.x
  const by1 = bounds.y
  const bx2 = bounds.x + bounds.width
  const by2 = bounds.y + bounds.height

  let x1 = start.x
  let y1 = start.y
  let x2 = start.x + start.width
  let y2 = start.y + start.height

  if (corner === 'se') {
    x2 += dx
    y2 += dy
  } else if (corner === 'sw') {
    x1 += dx
    y2 += dy
  } else if (corner === 'ne') {
    x2 += dx
    y1 += dy
  } else {
    x1 += dx
    y1 += dy
  }

  if (x2 - x1 < minW) {
    if (corner === 'se' || corner === 'ne') x2 = x1 + minW
    else x1 = x2 - minW
  }
  if (y2 - y1 < minH) {
    if (corner === 'se' || corner === 'sw') y2 = y1 + minH
    else y1 = y2 - minH
  }

  if (corner === 'se') {
    x1 = clamp(x1, bx1, bx2 - minW)
    y1 = clamp(y1, by1, by2 - minH)
    x2 = clamp(x2, x1 + minW, bx2)
    y2 = clamp(y2, y1 + minH, by2)
  } else if (corner === 'sw') {
    x2 = clamp(x2, bx1 + minW, bx2)
    y1 = clamp(y1, by1, by2 - minH)
    x1 = clamp(x1, bx1, x2 - minW)
    y2 = clamp(y2, y1 + minH, by2)
  } else if (corner === 'ne') {
    x1 = clamp(x1, bx1, bx2 - minW)
    y2 = clamp(y2, by1 + minH, by2)
    x2 = clamp(x2, x1 + minW, bx2)
    y1 = clamp(y1, by1, y2 - minH)
  } else {
    x2 = clamp(x2, bx1 + minW, bx2)
    y2 = clamp(y2, by1 + minH, by2)
    x1 = clamp(x1, bx1, x2 - minW)
    y1 = clamp(y1, by1, y2 - minH)
  }

  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 }
}
