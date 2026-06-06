import type { CropResizeHandle } from '@shared/utils/profileMedia'

export const WHEEL_ZOOM_SENS = 0.0022
export const WHEEL_CROP_SENS = 0.0022
export const SMOOTH_TIME = 0.16
export const WHEEL_IDLE_MS = 180

export const helpShortcuts = [
  { keys: ['滚轮'], label: '以指针为中心缩放背景' },
  { keys: ['Shift', '滚轮'], label: '以指针为中心缩放裁剪框', whenCrop: true },
  { keys: ['拖拽'], label: '移动背景位置' },
  { keys: ['Alt', '拖拽'], label: '裁剪模式下移动背景', whenCrop: true },
  { keys: ['空格', '拖拽'], label: '裁剪模式下移动背景', whenCrop: true },
  { keys: ['中键'], label: '还原缩放与位置' },
  { keys: ['Ctrl', '滚轮'], label: '调整透明度' },
  { keys: ['Shift', '中键'], label: '裁剪框铺满图片', whenCrop: true },
  { keys: ['Esc'], label: '取消' }
]

export const cropHandles: { corner: CropResizeHandle; class: string }[] = [
  { corner: 'nw', class: 'ww-bg-editor__crop-handle--nw' },
  { corner: 'ne', class: 'ww-bg-editor__crop-handle--ne' },
  { corner: 'sw', class: 'ww-bg-editor__crop-handle--sw' },
  { corner: 'se', class: 'ww-bg-editor__crop-handle--se' }
]

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}
