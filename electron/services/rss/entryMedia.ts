import type { Item } from 'rss-parser'

const FAVICON_GOOGLE = (host: string) =>
  `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`

const FAVICON_DDG = (host: string) =>
  `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`

/** 根据站点 URL 生成 favicon 服务地址（渲染进程可直接加载） */
export function faviconUrlFromSite(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname
    return FAVICON_GOOGLE(host)
  } catch {
    return ''
  }
}

/** 备用 favicon（Google 加载失败时由前端 onerror 切换） */
export function faviconFallbackUrlFromSite(siteUrl: string): string {
  try {
    const host = new URL(siteUrl).hostname
    return FAVICON_DDG(host)
  } catch {
    return ''
  }
}

/** 从已解析的 Feed 元数据取图标 */
export function iconUrlFromFeedMeta(feedUrl: string, feedImageUrl?: string | null): string {
  const trimmed = feedImageUrl?.trim()
  if (trimmed && /^https?:\/\//i.test(trimmed)) return trimmed
  return faviconUrlFromSite(feedUrl)
}

function normalizeImageUrl(src: string, baseUrl?: string): string | null {
  const trimmed = src.trim()
  if (!trimmed || trimmed.startsWith('data:')) return null
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  if (trimmed.startsWith('//')) return `https:${trimmed}`
  if (baseUrl && trimmed.startsWith('/')) {
    try {
      return new URL(trimmed, baseUrl).href
    } catch {
      return null
    }
  }
  return null
}

function firstImageFromHtml(html: string, baseUrl?: string): string | null {
  const patterns = [
    /<img[^>]+src=["']([^"']+)["']/gi,
    /<img[^>]+data-src=["']([^"']+)["']/gi,
    /<media:thumbnail[^>]+url=["']([^"']+)["']/gi
  ]
  for (const re of patterns) {
    re.lastIndex = 0
    const match = re.exec(html)
    if (match?.[1]) {
      const url = normalizeImageUrl(match[1], baseUrl)
      if (url) return url
    }
  }
  return null
}

function mediaUrl(value: unknown, baseUrl?: string): string | null {
  if (!value) return null
  if (typeof value === 'string') return normalizeImageUrl(value, baseUrl)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (typeof obj.url === 'string') return normalizeImageUrl(obj.url, baseUrl)
    const attrs = obj.$ as Record<string, unknown> | undefined
    if (typeof attrs?.url === 'string') return normalizeImageUrl(attrs.url, baseUrl)
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = mediaUrl(item, baseUrl)
      if (url) return url
    }
  }
  return null
}

function isLikelyImageUrl(url: string): boolean {
  return /\.(jpe?g|png|gif|webp|avif|bmp)(\?|$)/i.test(url) || /\/image|thumbnail|photo|pic/i.test(url)
}

/** 从 RSS 条目中提取缩略图 / 配图 URL */
export function extractEntryImageUrl(item: Item): string | null {
  const link = item.link?.trim()
  const enclosure = item.enclosure as { url?: string; type?: string } | undefined
  if (enclosure?.url) {
    const type = enclosure.type ?? ''
    if (type.startsWith('image/') || isLikelyImageUrl(enclosure.url)) {
      return normalizeImageUrl(enclosure.url, link) ?? enclosure.url
    }
  }

  const it = item as Item & Record<string, unknown>

  if (typeof it.thumbnail === 'string') {
    const t = normalizeImageUrl(it.thumbnail, link)
    if (t) return t
  }

  const fromMedia =
    mediaUrl(it['media:content'], link) ??
    mediaUrl(it['media:thumbnail'], link) ??
    mediaUrl(it.image, link) ??
    mediaUrl((it as { itunes?: { image?: unknown } }).itunes?.image, link)

  if (fromMedia) return fromMedia

  const html = String(it.content ?? it['content:encoded'] ?? it.summary ?? '')
  return firstImageFromHtml(html, link)
}
