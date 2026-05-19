/** 种子脚本用：Unsplash 归属与 UTM（与 src/shared/utils/unsplashAttribution.ts 保持一致） */
export const UNSPLASH_UTM_SOURCE = 'wanwu'

export function unsplashUrlWithUtm(baseUrl) {
  try {
    const u = new URL(baseUrl)
    u.searchParams.set('utm_source', UNSPLASH_UTM_SOURCE)
    u.searchParams.set('utm_medium', 'referral')
    return u.toString()
  } catch {
    return baseUrl
  }
}

export function unsplashHomeUrl() {
  return unsplashUrlWithUtm('https://unsplash.com/')
}

export function attributionFromApiPhoto(photo) {
  const username = photo.user?.username ?? ''
  const photoHtml = photo.links?.html ?? unsplashHomeUrl()
  const profileHtml =
    photo.user?.links?.html ?? (username ? `https://unsplash.com/@${username}` : unsplashHomeUrl())

  return {
    source: 'unsplash',
    photographerName: (photo.user?.name ?? '').trim() || 'Unknown',
    photographerUsername: username || undefined,
    photographerProfileUrl: unsplashUrlWithUtm(profileHtml),
    photoPageUrl: unsplashUrlWithUtm(photoHtml)
  }
}

/** 从 images.unsplash.com 直链解析 API 可用的 photo id（如 photo-1574158622682-e40e69881006） */
export function photoIdFromImageUrl(url) {
  try {
    const seg = new URL(url).pathname.split('/').filter(Boolean)[0] ?? ''
    return seg.startsWith('photo-') ? seg : null
  } catch {
    return null
  }
}

export async function fetchPhotoById(accessKey, photoId) {
  const res = await fetch(`https://api.unsplash.com/photos/${photoId}`, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    signal: AbortSignal.timeout(30_000)
  })
  if (!res.ok) throw new Error(`photos/${photoId} HTTP ${res.status}`)
  return res.json()
}

/** 按精选直链顺序拉取 4 张图的归属（与已下载 JPG 一一对应） */
export async function attributionsFromCuratedUrls(accessKey, urls, sleepFn = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const photos = []
  for (const url of urls.slice(0, 4)) {
    const id = photoIdFromImageUrl(url)
    if (!id) continue
    photos.push(await fetchPhotoById(accessKey, id))
    await sleepFn(350)
  }
  if (!photos.length) return null
  return {
    coverAttribution: attributionFromApiPhoto(photos[0]),
    galleryAttributions: [1, 2, 3].map((i) =>
      attributionFromApiPhoto(photos[i] ?? photos[photos.length - 1])
    )
  }
}
