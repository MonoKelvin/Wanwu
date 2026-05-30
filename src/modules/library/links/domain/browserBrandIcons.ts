import type { BrowserBookmarkSourceId } from '@shared/types/links'
import browserChrome from '@assets/icons/browser-chrome.svg'
import browserEdge from '@assets/icons/browser-edge.svg'
import browserFirefox from '@assets/icons/browser-firefox.svg'
import browserOpera from '@assets/icons/browser-opera.svg'
import browserSafari from '@assets/icons/browser-safari.svg'

const BROWSER_BRAND_ICON_URLS: Record<BrowserBookmarkSourceId, string> = {
  edge: browserEdge,
  chrome: browserChrome,
  firefox: browserFirefox,
  safari: browserSafari,
  opera: browserOpera
}

export function browserBrandIconUrl(id: BrowserBookmarkSourceId): string {
  return BROWSER_BRAND_ICON_URLS[id]
}
