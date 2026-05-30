/** 个人页背景图调节（相对路径存于 profiles.background_config JSON） */
export interface PersonalBackgroundConfig {
  scale: number
  offsetX: number
  offsetY: number
  opacity: number
  crop: PersonalBackgroundCrop | null
  cropSpace?: PersonalBackgroundCropSpace
}

export interface PersonalBackgroundCrop {
  /** 0–1，相对当前渲染后背景图矩形（随 scale/offset 变化） */
  x: number
  y: number
  width: number
  height: number
}

/** crop 坐标系：image=相对图片；viewport=旧版相对视口（仅兼容读取） */
export type PersonalBackgroundCropSpace = 'image' | 'viewport'

export interface UserProfile {
  nickname: string
  bio: string
  avatarPath: string | null
  backgroundPath: string | null
  backgroundConfig: PersonalBackgroundConfig | null
}

export const DEFAULT_BACKGROUND_CONFIG: PersonalBackgroundConfig = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  opacity: 1,
  crop: null
}
