import type { NoteColor } from '@shared/types/notes'

/** 便笺颜色环序（与 store.nextColor 一致） */
export const NOTE_COLORS: NoteColor[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
  'orange',
  'teal',
  'red',
  'gray'
]

export const NOTE_COLOR_LABELS: Record<NoteColor, string> = {
  yellow: '黄色',
  green: '绿色',
  blue: '蓝色',
  pink: '粉色',
  purple: '紫色',
  gray: '灰色',
  orange: '橙色',
  teal: '青色',
  red: '红色'
}
