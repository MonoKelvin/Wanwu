/** 背景缩放范围（与编辑器滑块、滚轮一致） */
export const BACKGROUND_SCALE_MIN = 0.2
export const BACKGROUND_SCALE_MAX = 5

/** 背景平移/缩放后，单边超出视口达到该比例（相对图片宽/高）时自动回弹 */
export const BACKGROUND_SNAP_OUTSIDE_RATIO = 0.9

/** 裁切框相对视口四周留白（px）；0 = 仅限制在页面内 */
export const CROP_VIEWPORT_INSET_PX = 0

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}
