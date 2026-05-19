/**
 * Pixabay REST API（与 Cursor pixabay-mcp 的 search_pixabay_images 同源）
 * 限速：100 次 / 60 秒 → 每次 API 调用至少间隔 600ms
 */

const API_BASE = 'https://pixabay.com/api/'

export class PixabayRateLimiter {
  /** @param {number} maxPerMinute 官方默认 100 */
  constructor(maxPerMinute = 100) {
    this.minIntervalMs = Math.ceil(60_000 / maxPerMinute)
    this.lastAt = 0
  }

  async wait() {
    const now = Date.now()
    const delay = this.lastAt + this.minIntervalMs - now
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))
    this.lastAt = Date.now()
  }
}

export function attributionFromPixabayHit(hit) {
  const user = (hit.user ?? '').trim() || 'Pixabay Contributor'
  const pageURL = hit.pageURL ?? 'https://pixabay.com/'
  const userId = hit.user_id
  const profileUrl =
    userId != null
      ? `https://pixabay.com/users/${encodeURIComponent(user)}-${userId}/`
      : 'https://pixabay.com/'

  return {
    source: 'pixabay',
    photographerName: user,
    photographerProfileUrl: profileUrl,
    photoPageUrl: pageURL
  }
}

/** 优先大图；排除 vector（与全库禁止 SVG 策略一致） */
export function imageDownloadUrl(hit) {
  const url =
    hit.fullHDURL ||
    hit.largeImageURL ||
    hit.webformatURL ||
    hit.previewURL
  if (!url) throw new Error('无图片地址')
  const lower = url.toLowerCase()
  if (lower.endsWith('.svg') || lower.includes('.svg?')) {
    throw new Error('跳过 SVG')
  }
  return url
}

/**
 * @param {string} apiKey
 * @param {string} query
 * @param {object} opts
 * @param {PixabayRateLimiter} [opts.limiter]
 */
/**
 * 按 matchTags 对结果排序，优先图文相符（避免猫条目出现纯风景）
 */
export function rankPixabayHits(
  hits,
  { matchTags = [], minMatchScore = 1, requiredTags = [] } = {}
) {
  let pool = hits
  if (requiredTags.length) {
    pool = hits.filter((hit) => {
      const tags = (hit.tags ?? '').toLowerCase()
      return requiredTags.every((t) => tags.includes(String(t).toLowerCase()))
    })
  }
  if (!matchTags.length) return pool

  const scoreOf = (hit) => {
    const tags = (hit.tags ?? '').toLowerCase()
    return matchTags.reduce((n, t) => (tags.includes(String(t).toLowerCase()) ? n + 1 : n), 0)
  }

  const scored = pool
    .map((hit) => ({ hit, score: scoreOf(hit) }))
    .sort((a, b) => b.score - a.score)

  const strong = scored.filter((s) => s.score >= minMatchScore).map((s) => s.hit)
  if (strong.length >= 4) return strong

  return scored.filter((s) => s.score > 0).map((s) => s.hit)
}

export async function searchPixabayImages(apiKey, query, opts = {}) {
  const {
    perPage = 24,
    imageType = 'photo',
    orientation = 'all',
    category,
    limiter,
    matchTags,
    minMatchScore = 1,
    requiredTags = []
  } = opts
  if (limiter) await limiter.wait()

  const url = new URL(API_BASE)
  url.searchParams.set('key', apiKey)
  url.searchParams.set('q', query)
  url.searchParams.set('image_type', imageType)
  url.searchParams.set('orientation', orientation)
  if (category) url.searchParams.set('category', category)
  url.searchParams.set('per_page', String(Math.min(200, Math.max(3, perPage))))
  url.searchParams.set('safesearch', 'true')
  url.searchParams.set('editors_choice', 'false')

  const res = await fetch(url, {
    headers: { 'User-Agent': 'Wanwu/1.0 (Library Seed; +https://github.com/MonoKelvin/Wanwu)' },
    signal: AbortSignal.timeout(30_000)
  })
  if (res.status === 429) {
    throw new Error('Pixabay API 限速（100 次/60 秒），请稍后重试')
  }
  if (!res.ok) throw new Error(`Pixabay 搜索失败 HTTP ${res.status}`)
  const data = await res.json()
  if (data.error) throw new Error(String(data.error))
  const hits = data.hits ?? []
  return rankPixabayHits(hits, { matchTags, minMatchScore, requiredTags })
}
