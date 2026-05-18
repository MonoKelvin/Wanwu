/**
 * 全库配图来源适配器（pixabay / unsplash API / manual）
 */
import { existsSync } from 'fs'
import {
  searchPixabayImages,
  attributionFromPixabayHit,
  imageDownloadUrl,
  PixabayRateLimiter
} from './pixabay-api-lib.mjs'
import { attributionFromApiPhoto } from './unsplash-attribution-lib.mjs'
import {
  IMAGES_PER_ITEM,
  DOWNLOAD_GAP_MS,
  downloadBinary,
  packCatalogMedia,
  itemMediaTargets,
  ensureItemDir,
  clearCoverSvg,
  sleep,
  relPath
} from './library-media-shared.mjs'

const unsplashLimiter = { lastAt: 0, minMs: 600 }
async function unsplashRateWait() {
  const now = Date.now()
  const d = unsplashLimiter.lastAt + unsplashLimiter.minMs - now
  if (d > 0) await sleep(d)
  unsplashLimiter.lastAt = Date.now()
}

async function searchUnsplash(accessKey, query, perPage) {
  await unsplashRateWait()
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('orientation', 'squarish')
  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${accessKey}`, 'Accept-Version': 'v1' },
    signal: AbortSignal.timeout(30_000)
  })
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

function imageUrlFromUnsplashPhoto(photo) {
  const base = photo.urls?.raw ?? photo.urls?.full ?? photo.urls?.regular
  if (!base) throw new Error('无图片地址')
  const u = new URL(base)
  u.searchParams.set('w', '1400')
  u.searchParams.set('q', '85')
  u.searchParams.set('fm', 'jpg')
  u.searchParams.set('auto', 'format')
  return u.toString()
}

/** @type {PixabayRateLimiter | null} */
let pixabayLimiter = null

export async function fetchHitsForItem(provider, apiKeys, config) {
  if (provider === 'manual') return null

  if (provider === 'pixabay') {
    const key = apiKeys.pixabay
    if (!key) throw new Error('缺少 PIXABAY_API_KEY')
    if (!pixabayLimiter) pixabayLimiter = new PixabayRateLimiter(100)
    return searchPixabayImages(key, config.query, {
      perPage: config.perPage,
      imageType: config.imageType,
      orientation: config.orientation,
      category: config.category,
      matchTags: config.matchTags,
      requiredTags: config.requiredTags,
      minMatchScore: config.minMatchScore,
      limiter: pixabayLimiter
    })
  }

  if (provider === 'unsplash') {
    const key = apiKeys.unsplash
    if (!key) throw new Error('缺少 UNSPLASH_ACCESS_KEY')
    return searchUnsplash(key, config.query, config.perPage ?? IMAGES_PER_ITEM)
  }

  throw new Error(`未知配图来源: ${provider}`)
}

export function attributionFromHit(provider, hit) {
  if (provider === 'pixabay') return attributionFromPixabayHit(hit)
  if (provider === 'unsplash') return attributionFromApiPhoto(hit)
  return null
}

export function downloadUrlFromHit(provider, hit) {
  if (provider === 'pixabay') return imageDownloadUrl(hit)
  if (provider === 'unsplash') return imageUrlFromUnsplashPhoto(hit)
  throw new Error('manual 模式无远程 URL')
}

export async function downloadItemMedia({ assetsLib, item, config, provider, apiKeys, force }) {
  const { dir, targets } = itemMediaTargets(assetsLib, item)
  ensureItemDir(dir)

  if (config.manualOnly) {
    const missing = targets.filter((t) => !existsSync(t.abs))
    if (missing.length) {
      throw new Error(`manual 缺少: ${missing.map((t) => t.name).join(', ')}`)
    }
    return {
      skipped: true,
      coverFile: relPath(item.categoryId, item.slug, 'cover.jpg'),
      galleryFiles: ['gallery-01.jpg', 'gallery-02.jpg', 'gallery-03.jpg'].map((f) =>
        relPath(item.categoryId, item.slug, f)
      )
    }
  }

  if (!force && targets.every((t) => existsSync(t.abs))) {
    if (provider === 'manual') return { skipped: true }
    const hits = await fetchHitsForItem(provider, apiKeys, config)
    if (!hits?.length) return { skipped: true }
    const attribFn = (h) => attributionFromHit(provider, h)
    const packed = packCatalogMedia(item, hits, attribFn)
    return {
      skipped: true,
      coverFile: packed.coverFile,
      galleryFiles: packed.galleryFiles,
      coverAttribution: packed.coverAttribution,
      galleryAttributions: packed.galleryAttributions
    }
  }

  const hits = await fetchHitsForItem(provider, apiKeys, config)
  if (!hits?.length) throw new Error('未找到匹配图片')

  const attribFn = (h) => attributionFromHit(provider, h)
  const userLabel = (hit) =>
    provider === 'pixabay' ? hit.user : hit.user?.name ?? 'Unsplash'

  for (let i = 0; i < targets.length; i++) {
    const hit = hits[i] ?? hits[hits.length - 1]
    const { abs, name } = targets[i]
    if (!force && existsSync(abs)) {
      console.log(`    ✓ ${name} (已有)`)
      continue
    }
    await downloadBinary(downloadUrlFromHit(provider, hit), abs)
    console.log(`    → ${name} (${userLabel(hit)})`)
    await sleep(DOWNLOAD_GAP_MS)
  }

  clearCoverSvg(dir)
  return packCatalogMedia(item, hits, attribFn)
}
