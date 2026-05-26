import { resolveChromiumBookmarksPath } from './chromium/bookmarksFile'
import { resolveFirefoxPlacesPath } from './firefox/profile'
import { getSafariBookmarksFilePath } from './safari/plistBookmarks'
import type { BrowserBookmarkProvider, BrowserSourceStatus } from './types'

const CHROMIUM_VENDORS = {
  edge: 'Microsoft/Edge',
  chrome: 'Google/Chrome',
  opera: 'Opera Software/Opera Stable'
} as const

export type ChromiumBookmarkSourceId = keyof typeof CHROMIUM_VENDORS

export type BrowserBookmarkSourceId = ChromiumBookmarkSourceId | 'firefox' | 'safari'

/** 默认浏览器来源（进入链接模块、恢复书签等场景的回退） */
export const DEFAULT_BROWSER_SOURCE_ID: BrowserBookmarkSourceId = 'edge'

function chromiumProvider(
  id: ChromiumBookmarkSourceId,
  rootFolderId: string,
  displayName: string,
  sortOrder: number
): BrowserBookmarkProvider {
  const vendorDir = CHROMIUM_VENDORS[id]
  return {
    id,
    rootFolderId,
    displayName,
    sortOrder,
    engine: 'chromium',
    supportsWriteBack: true,
    resolveBookmarksPath: (profile = 'Default') =>
      resolveChromiumBookmarksPath(vendorDir, profile)
  }
}

const firefoxProvider: BrowserBookmarkProvider = {
  id: 'firefox',
  rootFolderId: 'firefox-mozilla',
  displayName: 'Mozilla Firefox',
  sortOrder: 2,
  engine: 'firefox',
  supportsWriteBack: false,
  resolveBookmarksPath: () => resolveFirefoxPlacesPath()
}

const safariProvider: BrowserBookmarkProvider = {
  id: 'safari',
  rootFolderId: 'safari-apple',
  displayName: 'Safari',
  sortOrder: 3,
  engine: 'safari-plist',
  supportsWriteBack: false,
  resolveBookmarksPath: () => getSafariBookmarksFilePath()
}

/** 注册表：Chromium 系在此追加；Firefox / Safari 为独立引擎 */
export const BROWSER_BOOKMARK_PROVIDERS: readonly BrowserBookmarkProvider[] = [
  chromiumProvider('edge', 'edge-microsoft', 'Microsoft Edge', 0),
  chromiumProvider('chrome', 'chrome-google', 'Google Chrome', 1),
  firefoxProvider,
  safariProvider,
  chromiumProvider('opera', 'opera-stable', 'Opera', 4)
] as const

const byId = new Map(BROWSER_BOOKMARK_PROVIDERS.map((p) => [p.id, p]))

export function getBrowserBookmarkProvider(
  id: string
): BrowserBookmarkProvider | undefined {
  return byId.get(id)
}

export function defaultBrowserRootFolderId(): string {
  const provider = getBrowserBookmarkProvider(DEFAULT_BROWSER_SOURCE_ID)
  return provider?.rootFolderId ?? BROWSER_BOOKMARK_PROVIDERS[0]?.rootFolderId ?? 'edge-microsoft'
}

export function listBrowserBookmarkProviders(): BrowserBookmarkProvider[] {
  return [...BROWSER_BOOKMARK_PROVIDERS]
}

export function isBrowserBookmarkSourceId(id: string): id is BrowserBookmarkSourceId {
  return byId.has(id)
}

export function listBrowserSourceStatus(): BrowserSourceStatus[] {
  return BROWSER_BOOKMARK_PROVIDERS.map((p) => {
    const bookmarksPath = p.resolveBookmarksPath()
    return {
      id: p.id,
      displayName: p.displayName,
      rootFolderId: p.rootFolderId,
      engine: p.engine,
      available: !!bookmarksPath,
      supportsWriteBack: p.supportsWriteBack,
      bookmarksPath
    }
  })
}
