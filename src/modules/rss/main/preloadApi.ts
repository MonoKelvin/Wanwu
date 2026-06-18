import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { RSS_MODULE_ID } from '@shared/module-bridge/moduleIds'

export const rssPreloadModule: IPreloadModule = {
  id: RSS_MODULE_ID,
  order: 13,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      rss: {
        listGroups: () => ipcRenderer.invoke('rss:listGroups'),
        createGroup: (name) => ipcRenderer.invoke('rss:createGroup', { name }),
        renameGroup: (groupId, name) => ipcRenderer.invoke('rss:renameGroup', { groupId, name }),
        deleteGroup: (groupId) => ipcRenderer.invoke('rss:deleteGroup', { groupId }),
        listFeeds: () => ipcRenderer.invoke('rss:listFeeds'),
        createFeed: (input) => ipcRenderer.invoke('rss:createFeed', input),
        updateFeed: (input) => ipcRenderer.invoke('rss:updateFeed', input),
        moveFeed: (feedId, groupId, sortOrder) =>
          ipcRenderer.invoke('rss:moveFeed', { feedId, groupId, sortOrder }),
        softDeleteFeed: (feedId) => ipcRenderer.invoke('rss:softDeleteFeed', { feedId }),
        restoreFeed: (feedId) => ipcRenderer.invoke('rss:restoreFeed', { feedId }),
        permanentDeleteFeed: (feedId) => ipcRenderer.invoke('rss:permanentDeleteFeed', { feedId }),
        emptyRecycleBin: () => ipcRenderer.invoke('rss:emptyRecycleBin'),
        probeFeed: (feedId) => ipcRenderer.invoke('rss:probeFeed', { feedId }),
        fetchFeed: (feedId, fetchLimit) => ipcRenderer.invoke('rss:fetchFeed', { feedId, fetchLimit }),
        listEntries: (feedId, limit, offset) =>
          ipcRenderer.invoke('rss:listEntries', { feedId, limit, offset })
      }
    }
  }
}
