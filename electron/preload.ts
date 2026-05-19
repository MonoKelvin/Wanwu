import { contextBridge, ipcRenderer } from 'electron'
import type { WanwuApi } from '../src/shared/types/api'

const api: WanwuApi = {
  library: {
    listCategories: () => ipcRenderer.invoke('library:listCategories'),
    listItems: (params) => ipcRenderer.invoke('library:listItems', params),
    searchItems: (params) => ipcRenderer.invoke('library:searchItems', params),
    getItem: (id) => ipcRenderer.invoke('library:getItem', id),
    updateItem: (item) => ipcRenderer.invoke('library:updateItem', item),
    createItem: (item) => ipcRenderer.invoke('library:createItem', item)
  },
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
  },
  user: {
    getProfile: () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: (profile) => ipcRenderer.invoke('user:updateProfile', profile),
    listFavorites: () => ipcRenderer.invoke('user:listFavorites'),
    toggleFavorite: (params) => ipcRenderer.invoke('user:toggleFavorite', params)
  },
  app: {
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
    getSettings: () => ipcRenderer.invoke('app:getSettings'),
    updateSettings: (settings: unknown) => ipcRenderer.invoke('app:updateSettings', settings)
  },
  window: {
    getPlatform: () => ipcRenderer.invoke('window:getPlatform'),
    minimize: () => ipcRenderer.invoke('window:minimize'),
    toggleMaximize: () => ipcRenderer.invoke('window:toggleMaximize'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
    close: () => ipcRenderer.invoke('window:close'),
    onMaximizedChange: (listener: (maximized: boolean) => void) => {
      const handler = (_event: unknown, maximized: boolean) => listener(maximized)
      ipcRenderer.on('window:maximized-changed', handler)
      return () => ipcRenderer.removeListener('window:maximized-changed', handler)
    }
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
    downloadFile: (params) => ipcRenderer.invoke('shell:downloadFile', params),
    showItemInFolder: (url) => ipcRenderer.invoke('shell:showItemInFolder', url)
  }
}

contextBridge.exposeInMainWorld('wanwu', api)
