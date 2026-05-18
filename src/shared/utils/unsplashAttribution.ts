import type { MediaAttribution, MediaAttributionSource, UnsplashAttribution } from '@shared/types/unsplash'

/** 与 Unsplash 开发者指南一致的 utm_source */
export const UNSPLASH_UTM_SOURCE = 'wanwu'

export function unsplashUrlWithUtm(baseUrl: string): string {
  try {
    const u = new URL(baseUrl)
    u.searchParams.set('utm_source', UNSPLASH_UTM_SOURCE)
    u.searchParams.set('utm_medium', 'referral')
    return u.toString()
  } catch {
    return baseUrl
  }
}

export function unsplashHomeUrl(): string {
  return unsplashUrlWithUtm('https://unsplash.com/')
}

export function unsplashProfileUrl(username: string): string {
  const slug = username.replace(/^@/, '')
  return unsplashUrlWithUtm(`https://unsplash.com/@${slug}`)
}

/** 从 Unsplash API photo 对象构建归属（用于种子脚本，结构兼容 JSON） */
export function attributionFromApiPhoto(photo: {
  links?: { html?: string }
  user?: { name?: string; username?: string; links?: { html?: string } }
}): MediaAttribution {
  const username = photo.user?.username ?? ''
  const photoHtml = photo.links?.html ?? unsplashHomeUrl()
  const profileHtml = photo.user?.links?.html ?? (username ? `https://unsplash.com/@${username}` : unsplashHomeUrl())

  return {
    source: 'unsplash',
    photographerName: photo.user?.name?.trim() || 'Unknown',
    photographerUsername: username || undefined,
    photographerProfileUrl: unsplashUrlWithUtm(profileHtml),
    photoPageUrl: unsplashUrlWithUtm(photoHtml)
  }
}

export function mediaAttributionSource(
  value: MediaAttribution | null | undefined
): MediaAttributionSource {
  if (value?.source === 'pixabay' || value?.source === 'unsplash') return value.source
  if (value?.photoPageUrl?.includes('pixabay.com')) return 'pixabay'
  return 'unsplash'
}

export function isMediaAttribution(
  value: MediaAttribution | null | undefined
): value is MediaAttribution {
  return Boolean(value?.photographerName && value?.photoPageUrl)
}

export function isUnsplashAttribution(
  value: UnsplashAttribution | null | undefined
): value is UnsplashAttribution {
  return isMediaAttribution(value) && mediaAttributionSource(value) === 'unsplash'
}
