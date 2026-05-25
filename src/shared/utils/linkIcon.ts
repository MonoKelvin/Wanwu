/** 书签站点图标 URL（按优先级尝试） */

export function linkFaviconSources(pageUrl: string): string[] {
  try {
    const { hostname } = new URL(pageUrl)
    if (!hostname) return []
    const host = encodeURIComponent(hostname)
    return [
      `https://icons.duckduckgo.com/ip3/${host}.ico`,
      `https://www.google.com/s2/favicons?domain=${host}&sz=128`
    ]
  } catch {
    return []
  }
}

/** Google 等 CDN 在无法识别站点时常返回 16×16 通用图，放大后发糊 */
export const LINK_FAVICON_MIN_PX = 20

export function isLikelyGenericFavicon(img: HTMLImageElement): boolean {
  return img.naturalWidth > 0 && img.naturalWidth < LINK_FAVICON_MIN_PX
}
