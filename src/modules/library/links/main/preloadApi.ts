import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { LINKS_MODULE_ID } from '@shared/module-bridge/moduleIds'

export const linksPreloadModule: IPreloadModule = {
  id: LINKS_MODULE_ID,
  order: 12,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      links: {
        listFolders: () => ipcRenderer.invoke('links:listFolders'),
        listBookmarks: (params: { folderId: string; includeDeleted?: boolean }) =>
          ipcRenderer.invoke('links:listBookmarks', params),
        listAllBookmarks: () => ipcRenderer.invoke('links:listAllBookmarks'),
        listBrowserSources: () => ipcRenderer.invoke('links:listBrowserSources'),
        syncFromBrowser: (params: { browserSourceId: string }) =>
          ipcRenderer.invoke('links:syncFromBrowser', params),
        syncToBrowser: (params: { browserSourceId: string }) =>
          ipcRenderer.invoke('links:syncToBrowser', params),
        reorderBookmarks: (params: { folderId: string; orderedIds: string[] }) =>
          ipcRenderer.invoke('links:reorderBookmarks', params),
        sync: () => ipcRenderer.invoke('links:sync'),
        createFolder: (input: { parentId: string; name: string }) =>
          ipcRenderer.invoke('links:createFolder', input),
        deleteFolder: (input: { folderId: string; moveBookmarksToRoot: boolean }) =>
          ipcRenderer.invoke('links:deleteFolder', input),
        createBookmark: (input: { folderId: string; title: string; url: string }) =>
          ipcRenderer.invoke('links:createBookmark', input),
        updateBookmark: (input: { id: string; title?: string; url?: string; folderId?: string }) =>
          ipcRenderer.invoke('links:updateBookmark', input),
        softDeleteBookmark: (id: string) => ipcRenderer.invoke('links:softDeleteBookmark', id),
        restoreBookmark: (id: string) => ipcRenderer.invoke('links:restoreBookmark', id),
        permanentDeleteBookmark: (id: string) => ipcRenderer.invoke('links:permanentDeleteBookmark', id),
        probeUnreachable: (
          ids: string[],
          onProgress?: (progress: { done: number; total: number }) => void
        ) => {
          const progressChannel = onProgress ? `links:probe-progress:${crypto.randomUUID()}` : undefined
          const handler = (_: unknown, progress: { done: number; total: number }) => onProgress?.(progress)
          if (progressChannel && onProgress) ipcRenderer.on(progressChannel, handler)
          return ipcRenderer
            .invoke('links:probeUnreachable', { ids, progressChannel })
            .finally(() => {
              if (progressChannel) ipcRenderer.removeListener(progressChannel, handler)
            })
        },
        onBookmarksFileChanged: (listener: (payload: { browserSourceId: string }) => void) => {
          const handler = (_: unknown, payload: { browserSourceId: string }) => listener(payload)
          ipcRenderer.on('links:bookmarks-file-changed', handler)
          return () => ipcRenderer.removeListener('links:bookmarks-file-changed', handler)
        }
      }
    }
  }
}
