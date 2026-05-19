/**
 * 全库配图来源适配器（pixabay / unsplash API / manual）
 */
import { existsSync } from 'fs'
import { join } from 'path'
import {
  searchPixabayImages,
  attributionFromPixabayHit,
  imageDownloadUrl,
  PixabayRateLimiter
} from './pixabay-api.mjs'
import { attributionFromApiPhoto } from './attribution.mjs'
import {
  DEFAULT_IMAGES_PER_ITEM,
  downloadBinary,
  packCatalogMediaFromSlots,
  itemMediaTargets,
  ensureItemDir,
  clearCoverSvg,
  sleep,
  dedupeHits,
  pruneGalleryFiles
} from './media-shared.mjs'
import { isValidMediaFile } from './disk-media.mjs'

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
    return searchUnsplash(key, config.query, config.perPage ?? DEFAULT_IMAGES_PER_ITEM)
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

/** 已有有效封面则跳过下载 */
function hasValidCover(dir, targets) {
  const cover = targets.find((t) => t.name === 'cover.jpg')
  return cover ? isValidMediaFile(cover.abs) : false
}

export async function downloadItemMedia({ assetsLib, item, config, provider, apiKeys, force }) {
  const imageCount = config.imageCount ?? DEFAULT_IMAGES_PER_ITEM
  const { dir, targets } = itemMediaTargets(assetsLib, item, imageCount)
  ensureItemDir(dir)

  if (config.manualOnly) {
    if (!hasValidCover(dir, targets)) {
      throw new Error('manual 缺少有效 cover.jpg')
    }
    return { skipped: true, fromDisk: true }
  }

  if (!force && hasValidCover(dir, targets)) {
    return { skipped: true, fromDisk: true }
  }

  const hits = await fetchHitsForItem(provider, apiKeys, config)
  const unique = dedupeHits(hits ?? [], imageCount)

  if (!unique.length) {
    throw new Error('未找到与条目相符的图片')
  }

  const attribFn = (h) => attributionFromHit(provider, h)
  const ordered = await Promise.all(
    unique.map(async (hit, index) => {
      const name = index === 0 ? 'cover.jpg' : `gallery-${String(index).padStart(2, '0')}.jpg`
      const abs = join(dir, name)
      await downloadBinary(downloadUrlFromHit(provider, hit), abs)
      return { name, attribution: attribFn(hit) }
    })
  )
  if (!ordered.length || !isValidMediaFile(join(dir, 'cover.jpg'))) {
    throw new Error('封面下载失败')
  }

  pruneGalleryFiles(
    dir,
    new Set(ordered.map((s) => s.name))
  )
  clearCoverSvg(dir)

  return packCatalogMediaFromSlots(item, ordered)
}
