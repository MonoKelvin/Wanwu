import { ipcMain } from 'electron'
import type { AppServices } from '../types'

export function registerLinksHandlers(services: AppServices): void {
  ipcMain.handle('links:listFolders', () => services.links?.listFolders() ?? [])
  ipcMain.handle('links:listBookmarks', (_e, params: { folderId: string; includeDeleted?: boolean }) => {
    return services.links?.listBookmarks(params.folderId, { includeDeleted: params.includeDeleted }) ?? []
  })
  ipcMain.handle('links:listAllBookmarks', () => services.links?.listAllBookmarks() ?? [])
  ipcMain.handle('links:listBrowserSources', () => {
    if (!services.links) throw new Error('链接服务未就绪')
    return services.links.listBrowserSources()
  })
  ipcMain.handle(
    'links:syncFromBrowser',
    (_e, params: { browserSourceId: string }) => {
      if (!services.links) throw new Error('链接服务未就绪')
      return services.links.syncFromBrowser(params.browserSourceId)
    }
  )
  ipcMain.handle(
    'links:syncToBrowser',
    (_e, params: { browserSourceId: string }) => {
      if (!services.links) throw new Error('链接服务未就绪')
      return services.links.syncToBrowser(params.browserSourceId)
    }
  )
  ipcMain.handle('links:reorderBookmarks', (_e, params: { folderId: string; orderedIds: string[] }) => {
    if (!services.links) throw new Error('链接服务未就绪')
    services.links.reorderBookmarks(params.folderId, params.orderedIds)
  })
  /** @deprecated 实时同步等场景：完整双向合并 */
  ipcMain.handle('links:sync', () => {
    if (!services.links) throw new Error('链接服务未就绪')
    return services.links.syncMerge()
  })
  ipcMain.handle('links:createFolder', (_e, input: { parentId: string; name: string }) => {
    if (!services.links) throw new Error('链接服务未就绪')
    return services.links.createFolder(input)
  })
  ipcMain.handle(
    'links:deleteFolder',
    (_e, input: { folderId: string; moveBookmarksToRoot: boolean }) => {
      if (!services.links) throw new Error('链接服务未就绪')
      services.links.deleteFolder(input)
    }
  )
  ipcMain.handle('links:createBookmark', (_e, input: { folderId: string; title: string; url: string }) => {
    if (!services.links) throw new Error('链接服务未就绪')
    return services.links.createBookmark(input)
  })
  ipcMain.handle('links:updateBookmark', (_e, input: { id: string; title?: string; url?: string; folderId?: string }) => {
    if (!services.links) throw new Error('链接服务未就绪')
    return services.links.updateBookmark(input)
  })
  ipcMain.handle('links:softDeleteBookmark', (_e, id: string) => {
    services.links?.softDeleteBookmark(id)
  })
  ipcMain.handle('links:restoreBookmark', (_e, id: string) => {
    services.links?.restoreBookmark(id)
  })
  ipcMain.handle('links:permanentDeleteBookmark', (_e, id: string) => {
    services.links?.permanentDeleteBookmark(id)
  })
  ipcMain.handle(
    'links:probeUnreachable',
    async (event, payload: { ids: string[]; progressChannel?: string }) => {
      if (!services.links) {
        return {
          results: {},
          invalidCount: 0,
          byIssue: { invalid_syntax: 0, network: 0, http_status: 0, timeout: 0 }
        }
      }
      const ids = payload?.ids ?? []
      const channel = payload?.progressChannel
      const sender = event.sender
      return services.links.probeUnreachable(ids, (progress) => {
        if (channel && !sender.isDestroyed()) {
          sender.send(channel, progress)
        }
      })
    }
  )
}
