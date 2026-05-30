import { toWanwuMediaUrl } from '@shared/utils/profileMedia'

export type CaAmbientVideoKey = 'home' | 'projects'

function devHttpPlaylist(key: CaAmbientVideoKey): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/__ca-video/${key}/video.m3u8`
}

/** rabenrifaie.com 背景 HLS（assets/cloud-abode/video/） */
export function caAmbientVideoPlaylist(key: CaAmbientVideoKey = 'home'): string {
  if (import.meta.env.DEV) {
    return devHttpPlaylist(key)
  }
  return toWanwuMediaUrl(`cloud-abode/video/${key}/video.m3u8`) ?? ''
}

export function resolveAmbientVideoKey(routeName: string | symbol | null | undefined): CaAmbientVideoKey {
  if (routeName === 'cloud-abode-mall' || routeName === 'cloud-abode-mall-detail') {
    return 'projects'
  }
  return 'home'
}
