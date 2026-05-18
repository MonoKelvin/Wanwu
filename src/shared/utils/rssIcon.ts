/** 无站点地址时的默认 RSS 图标（Iconify CDN） */
export function defaultRssFeedIconUrl(): string {
  return 'https://api.iconify.design/mdi/rss-box.svg?color=%23888888'
}

/** 订阅源站点 favicon（Google CDN） */
export function faviconUrlFromFeedUrl(feedUrl: string, sz: 32 | 64 = 64): string {
  try {
    const host = new URL(feedUrl).hostname
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sz}`
  } catch {
    return ''
  }
}

/** 侧栏订阅图标占位：优先站点 favicon，否则通用 RSS 图标 */
export function feedIconPlaceholderUrl(feedUrl?: string, sz: 32 | 64 = 32): string {
  if (feedUrl?.trim()) {
    const favicon = faviconUrlFromFeedUrl(feedUrl, sz)
    if (favicon) return favicon
  }
  return defaultRssFeedIconUrl()
}

/** DuckDuckGo favicon 备用 */
export function faviconFallbackFromFeedUrl(feedUrl: string): string {
  try {
    const host = new URL(feedUrl).hostname
    return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`
  } catch {
    return ''
  }
}

export function resolveFeedIconUrl(feedUrl: string, iconUrl?: string | null): string {
  const custom = iconUrl?.trim()
  if (custom && /^https?:\/\//i.test(custom)) return custom
  return faviconUrlFromFeedUrl(feedUrl)
}

/** 条目无配图时：优先文章链接域名图标，其次订阅源图标 */
export function resolveEntryThumbIconUrl(
  entryLink: string | undefined,
  feedUrl: string | undefined,
  feedIconUrl?: string | null
): string {
  if (entryLink) {
    const fromLink = faviconUrlFromFeedUrl(entryLink)
    if (fromLink) return fromLink
  }
  if (feedUrl) return resolveFeedIconUrl(feedUrl, feedIconUrl)
  return ''
}
