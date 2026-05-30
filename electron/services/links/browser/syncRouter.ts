import type Database from 'better-sqlite3'
import type { LinksSyncResult } from '../../../../src/shared/types/links'
import { syncChromiumBookmarksIntoDb } from './chromium/syncPull'
import { syncChromiumBookmarksToFile } from './chromium/syncPush'
import { syncFirefoxBookmarksIntoDb } from './firefox/syncPull'
import { syncSafariBookmarksIntoDb } from './safari/syncPull'
import type { BrowserBookmarkProvider } from './types'

export function syncBrowserBookmarksIntoDb(
  db: Database.Database,
  provider: BrowserBookmarkProvider
): LinksSyncResult {
  switch (provider.engine) {
    case 'chromium':
      return syncChromiumBookmarksIntoDb(db, provider)
    case 'firefox':
      return syncFirefoxBookmarksIntoDb(db, provider)
    case 'safari-plist':
      return syncSafariBookmarksIntoDb(db, provider)
    default:
      throw new Error(`未实现的收藏夹引擎：${(provider as BrowserBookmarkProvider).engine}`)
  }
}

export function syncBrowserBookmarksToFile(
  db: Database.Database,
  provider: BrowserBookmarkProvider
): {
  pushed: number
  updated: number
  removed: number
  failed: number
} {
  if (!provider.supportsWriteBack) {
    throw new Error(
      `${provider.displayName} 暂不支持写回浏览器收藏夹，请使用「同步到软件」导入，或在 Chromium 系浏览器中编辑`
    )
  }
  if (provider.engine !== 'chromium') {
    throw new Error(`${provider.displayName} 不支持写回`)
  }
  return syncChromiumBookmarksToFile(db, provider)
}
