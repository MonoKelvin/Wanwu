/** 个人页背景图调节（相对路径存于 profiles.background_config JSON） */
export interface PersonalBackgroundConfig {
  scale: number
  offsetX: number
  offsetY: number
  opacity: number
  crop: PersonalBackgroundCrop | null
}

export interface PersonalBackgroundCrop {
  /** 0–1 可见区域左上角 */
  x: number
  y: number
  width: number
  height: number
}

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
