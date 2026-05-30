/**
 * 分享目标。
 *
 * - local：保存到本地
 * - system：Windows / macOS 系统分享面板（electron-native-share）
 * - weibo / qqzone：经 Litterbox 临时图床上传后打开 Web 分享页（pic 需公网 URL）
 */
export type ShareTargetId = 'local' | 'system' | 'weibo' | 'qqzone'

export interface ShareTarget {
  id: ShareTargetId
  label: string
  /** WwIcon name（Lucide） */
  icon: 'download' | 'share' | 'globe' | 'smartphone'
  /** 是否需要先上传到临时图床 */
  requiresUpload?: boolean
  /** 是否仅支持 PNG / JPEG 长图（不支持 HTML） */
  imageOnly?: boolean
  /** 是否仅在有原生分享能力时显示 */
  nativeOnly?: boolean
}

export const SHARE_TARGETS: ShareTarget[] = [
  {
    id: 'local',
    label: '保存到本地',
    icon: 'download'
  },
  {
    id: 'system',
    label: '系统分享',
    icon: 'share',
    nativeOnly: true
  },
  {
    id: 'weibo',
    label: '微博',
    icon: 'globe',
    requiresUpload: true,
    imageOnly: true
  },
  {
    id: 'qqzone',
    label: 'QQ 空间',
    icon: 'smartphone',
    requiresUpload: true,
    imageOnly: true
  }
]

/** Litterbox 临时链接默认有效期 */
export const SHARE_TEMP_EXPIRE_HOURS = 24

export const SHARE_TEMP_EXPIRE_LABEL = `${SHARE_TEMP_EXPIRE_HOURS} 小时`
