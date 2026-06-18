import { ipcMain } from 'electron'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule, MainProcessInitContext } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { LINKS_MODULE_ID } from '@modules/library/links/domain/moduleId'
import { LinksService } from './service/service'
import { resolveWanwuPath } from '../../../../../electron/services/data/paths'
import { getMainWindow } from '../../../../../electron/windowState'
import { startBrowserBookmarksWatchers } from './service/bookmarksWatcher'

type LinksSvc = LinksService

function getService(ctx: MainProcessInitContext): LinksSvc | null {
  return getModuleRuntimeService<LinksSvc>(ctx, LINKS_MODULE_ID)
}

function requireService(ctx: MainProcessInitContext): LinksSvc {
  const service = getService(ctx)
  if (!service) throw new Error('链接服务未就绪')
  return service
}

export const linksMainModule: IMainProcessModule = {
  id: LINKS_MODULE_ID,
  order: 12,

  initServices(ctx) {
    setModuleRuntimeService(ctx, LINKS_MODULE_ID, new LinksService(resolveWanwuPath()))
  },

  onModulesReady() {
    startBrowserBookmarksWatchers(() => getMainWindow())
  },

  onDispose(ctx) {
    getService(ctx)?.close()
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('links:listFolders', () => getService(ctx)?.listFolders() ?? [])
    ipcMain.handle(
      'links:listBookmarks',
      (_e, params: { folderId: string; includeDeleted?: boolean }) =>
        getService(ctx)?.listBookmarks(params.folderId, { includeDeleted: params.includeDeleted }) ?? []
    )
    ipcMain.handle('links:listAllBookmarks', () => getService(ctx)?.listAllBookmarks() ?? [])
    ipcMain.handle('links:listBrowserSources', () => requireService(ctx).listBrowserSources())
    ipcMain.handle('links:syncFromBrowser', (_e, params: { browserSourceId: string }) =>
      requireService(ctx).syncFromBrowser(params.browserSourceId)
    )
    ipcMain.handle('links:syncToBrowser', (_e, params: { browserSourceId: string }) =>
      requireService(ctx).syncToBrowser(params.browserSourceId)
    )
    ipcMain.handle('links:reorderBookmarks', (_e, params: { folderId: string; orderedIds: string[] }) => {
      requireService(ctx).reorderBookmarks(params.folderId, params.orderedIds)
    })
    ipcMain.handle('links:sync', () => requireService(ctx).syncMerge())
    ipcMain.handle('links:createFolder', (_e, input: { parentId: string; name: string }) =>
      requireService(ctx).createFolder(input)
    )
    ipcMain.handle(
      'links:deleteFolder',
      (_e, input: { folderId: string; moveBookmarksToRoot: boolean }) => {
        requireService(ctx).deleteFolder(input)
      }
    )
    ipcMain.handle(
      'links:createBookmark',
      (_e, input: { folderId: string; title: string; url: string }) =>
        requireService(ctx).createBookmark(input)
    )
    ipcMain.handle(
      'links:updateBookmark',
      (_e, input: { id: string; title?: string; url?: string; folderId?: string }) =>
        requireService(ctx).updateBookmark(input)
    )
    ipcMain.handle('links:softDeleteBookmark', (_e, id: string) => {
      getService(ctx)?.softDeleteBookmark(id)
    })
    ipcMain.handle('links:restoreBookmark', (_e, id: string) => {
      getService(ctx)?.restoreBookmark(id)
    })
    ipcMain.handle('links:permanentDeleteBookmark', (_e, id: string) => {
      getService(ctx)?.permanentDeleteBookmark(id)
    })
    ipcMain.handle(
      'links:probeUnreachable',
      async (event, payload: { ids: string[]; progressChannel?: string }) => {
        const service = getService(ctx)
        if (!service) {
          return {
            results: {},
            invalidCount: 0,
            byIssue: { invalid_syntax: 0, network: 0, http_status: 0, timeout: 0 }
          }
        }
        const ids = payload?.ids ?? []
        const channel = payload?.progressChannel
        const sender = event.sender
        return service.probeUnreachable(ids, (progress) => {
          if (channel && !sender.isDestroyed()) sender.send(channel, progress)
        })
      }
    )
  },

  getQuickAccessKindLimit() {
    return { kind: 'link', limit: 4, order: 40 }
  },

  searchQuickAccess(ctx, query, limit) {
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    const lower = query.toLowerCase()
    for (const bookmark of service.listAllBookmarks()) {
      if (bookmark.deleted) continue
      const hay = `${bookmark.title} ${bookmark.url}`.toLowerCase()
      if (!hay.includes(lower)) continue
      hits.push({
        kind: 'link',
        id: bookmark.id,
        title: bookmark.title.trim() || bookmark.url,
        subtitle: bookmark.url,
        linkUrl: bookmark.url
      })
      if (hits.length >= limit) break
    }
    return hits
  }
}
