import type { PersonalBackgroundConfig, PersonalBackgroundCrop } from '@shared/types/profile'
import { normalizeBackgroundConfig } from './core'
import { imageCropToViewportCrop } from './crop'
import { backgroundImageRect } from './core'

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
