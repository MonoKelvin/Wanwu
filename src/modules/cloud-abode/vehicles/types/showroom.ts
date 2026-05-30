/** 展车展示模式（对标 gamemcu StateTable） */
export type ShowroomViewMode = 'customize' | 'drive' | 'aero' | 'radar' | 'size'

export interface ShowroomModeOption {
  id: ShowroomViewMode
  label: string
}

export const SHOWROOM_MODE_OPTIONS: ShowroomModeOption[] = [
  { id: 'customize', label: '定制' },
  { id: 'drive', label: '行驶' },
  { id: 'aero', label: '风阻' },
  { id: 'radar', label: '雷达' },
  { id: 'size', label: '尺寸' }
]
