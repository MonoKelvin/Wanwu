import { ipcMain, app } from 'electron'
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

  ipcMain.handle('library:getItem', (_e, id: string) => {
    return services.library?.getItem(id) ?? null
  })

  ipcMain.handle('library:updateItem', (_e, item: unknown) => {
    return services.library?.updateItem(item as Parameters<NonNullable<typeof services.library>['updateItem']>[0])
  })

  ipcMain.handle('library:createItem', (_e, item: unknown) => {
    return services.library?.createItem(item as Parameters<NonNullable<typeof services.library>['createItem']>[0])
  })

  ipcMain.handle('custom:checkDuplicate', (_e, { name }: { name: string }) => {
    return services.library?.checkCategoryDuplicate(name) ?? { duplicate: false }
  })

  ipcMain.handle('custom:listCategories', () => {
    return services.db?.listCustomCategories() ?? []
  })

  ipcMain.handle('custom:listItems', (_e, params: { categoryId: string }) => {
    return services.db?.listCustomItems(params.categoryId) ?? []
  })

  ipcMain.handle('rss:listFeeds', () => {
    return services.rss?.listFeeds() ?? []
  })

  ipcMain.handle('rss:fetchFeed', (_e, { feedId }: { feedId: string }) => {
    return services.rss?.fetchFeed(feedId)
  })

  ipcMain.handle('rss:listEntries', (_e, { feedId }: { feedId: string }) => {
    return services.rss?.listEntries(feedId) ?? []
  })

  ipcMain.handle('user:getProfile', () => {
    return services.db?.getProfile()
  })

  ipcMain.handle('user:updateProfile', (_e, profile: unknown) => {
    return services.db?.updateProfile(profile as { nickname: string; bio: string })
  })

  ipcMain.handle('user:listFavorites', () => {
    return services.db?.listFavorites() ?? []
  })

  ipcMain.handle('user:toggleFavorite', (_e, params: { itemId: string; source: string }) => {
    return services.db?.toggleFavorite(params.itemId, params.source)
  })

  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
    wanwu: `${app.getPath('userData')}/wanwu`
  }))
}
