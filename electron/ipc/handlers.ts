import { ipcMain, app } from 'electron'
import {
  downloadMediaFile,
  openExternalUrl,
  showMediaInFolder
} from '../services/shellMedia'
import { getMainWindow, broadcastMaximizedState } from '../windowState'
import type { DatabaseService } from '../services/database'
import type { LibraryService } from '../services/libraryService'
import type { RssService } from '../services/rssService'
import type { MediaService } from '../services/mediaService'

export interface AppServices {
  db: DatabaseService | null
  library: LibraryService | null
  rss: RssService | null
  media: MediaService | null
}

export function registerIpcHandlers(services: AppServices): void {
  ipcMain.handle('library:listCategories', () => {
    return services.library?.listCategories() ?? []
  })

  ipcMain.handle('library:listItems', (_e, params: { categoryId: string; subCategoryId?: string }) => {
    return services.library?.listItems(params.categoryId, params.subCategoryId) ?? []
  })

  ipcMain.handle('library:searchItems', (_e, params: { query: string; limit?: number }) => {
    return services.library?.searchItems(params.query, params.limit) ?? []
  })

  ipcMain.handle('library:getItem', (_e, id: string) => {
    return services.library?.getItem(id) ?? null
  })

  ipcMain.handle('library:updateItem', (_e, item: unknown) => {
    return services.library?.updateItem(item as Parameters<NonNullable<typeof services.library>['updateItem']>[0])
  })

  ipcMain.handle('library:createItem', (_e, item: unknown) => {
    return services.library?.createItem(item as Parameters<NonNullable<typeof services.library>['createItem']>[0])
  })

  ipcMain.handle('rss:listGroups', () => services.rss?.listGroups() ?? [])

  ipcMain.handle('rss:createGroup', (_e, payload: { name?: string } | string) => {
    if (!services.rss) throw new Error('RSS 服务未就绪')
    const name = typeof payload === 'string' ? payload : payload?.name
    if (!name?.trim()) throw new Error('请填写分组名称')
    return services.rss.createGroup(name.trim())
  })

  ipcMain.handle('rss:renameGroup', (_e, { groupId, name }: { groupId: string; name: string }) => {
    services.rss?.renameGroup(groupId, name)
  })

  ipcMain.handle('rss:deleteGroup', (_e, { groupId }: { groupId: string }) => {
    services.rss?.deleteGroup(groupId)
  })

  ipcMain.handle('rss:listFeeds', () => services.rss?.listFeeds() ?? [])

  ipcMain.handle('rss:createFeed', (_e, input: unknown) => {
    return services.rss?.createFeed(input as Parameters<NonNullable<typeof services.rss>['createFeed']>[0])
  })

  ipcMain.handle('rss:updateFeed', (_e, input: unknown) => {
    return services.rss?.updateFeed(input as Parameters<NonNullable<typeof services.rss>['updateFeed']>[0])
  })

  ipcMain.handle('rss:moveFeed', (_e, { feedId, groupId, sortOrder }: { feedId: string; groupId: string; sortOrder?: number }) => {
    services.rss?.moveFeed(feedId, groupId, sortOrder)
  })

  ipcMain.handle('rss:softDeleteFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.softDeleteFeed(feedId)
  })

  ipcMain.handle('rss:restoreFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.restoreFeed(feedId)
  })

  ipcMain.handle('rss:permanentDeleteFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.permanentDeleteFeed(feedId)
  })

  ipcMain.handle('rss:emptyRecycleBin', () => {
    services.rss?.emptyRecycleBin()
  })

  ipcMain.handle('rss:probeFeed', (_e, { feedId }: { feedId: string }) => {
    return services.rss?.probeFeed(feedId)
  })

  ipcMain.handle(
    'rss:fetchFeed',
    (_e, { feedId, fetchLimit }: { feedId: string; fetchLimit?: number }) => {
      return services.rss?.fetchFeed(feedId, fetchLimit ?? 20)
    }
  )

  ipcMain.handle(
    'rss:listEntries',
    (_e, { feedId, limit, offset }: { feedId: string; limit?: number; offset?: number }) => {
      return services.rss?.listEntries(feedId, limit ?? 20, offset ?? 0) ?? { items: [], total: 0 }
    }
  )

  ipcMain.handle('user:getProfile', () => {
    return services.db?.getProfile()
  })

  ipcMain.handle('user:updateProfile', (_e, profile: unknown) => {
    return services.db?.updateProfile(profile as { nickname: string; bio: string })
  })

  ipcMain.handle('user:listFavorites', () => {
    return services.library?.listFavoriteEntries() ?? []
  })

  ipcMain.handle('user:toggleFavorite', (_e, params: { itemId: string; source: string }) => {
    return services.db?.toggleFavorite(params.itemId, params.source)
  })

  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
    wanwu: `${app.getPath('userData')}/wanwu`
  }))

  ipcMain.handle('app:getSettings', () => {
    return services.db?.getAppSettings() ?? { navAlign: 'start', navDisplay: 'icon', rssFetchLimit: 20 }
  })

  ipcMain.handle('app:updateSettings', (_e, settings: unknown) => {
    services.db?.updateAppSettings(
      settings as { navAlign: string; navDisplay: string }
    )
  })

  ipcMain.handle('window:getPlatform', () => process.platform)

  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', () => {
    const win = getMainWindow()
    if (!win) return false
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    broadcastMaximizedState()
    return win.isMaximized()
  })

  ipcMain.handle('window:isMaximized', () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close()
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => openExternalUrl(url))

  ipcMain.handle(
    'shell:downloadFile',
    (_e, params: { url: string; defaultName?: string }) => downloadMediaFile(params.url, params.defaultName)
  )

  ipcMain.handle('shell:showItemInFolder', (_e, url: string) => showMediaInFolder(url))
}
