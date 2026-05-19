import { contextBridge, ipcRenderer } from 'electron'
import type { WanwuApi } from '../src/shared/types/api'

const api: WanwuApi = {
  library: {
    listCategories: () => ipcRenderer.invoke('library:listCategories'),
    listItems: (params) => ipcRenderer.invoke('library:listItems', params),
    searchItems: (params) => ipcRenderer.invoke('library:searchItems', params),
    getItem: (id) => ipcRenderer.invoke('library:getItem', id),
    updateItem: (item) => ipcRenderer.invoke('library:updateItem', item),
    createItem: (item) => ipcRenderer.invoke('library:createItem', item),
    uploadItemImage: (params) => ipcRenderer.invoke('library:uploadItemImage', params)
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
    listFavoriteGroups: () => ipcRenderer.invoke('user:listFavoriteGroups'),
    listFavoriteGroupsForPicker: () => ipcRenderer.invoke('user:listFavoriteGroupsForPicker'),
    createFavoriteGroup: (name) => ipcRenderer.invoke('user:createFavoriteGroup', name),
    isFavorite: (params) => ipcRenderer.invoke('user:isFavorite', params),
    addFavorite: (params) => ipcRenderer.invoke('user:addFavorite', params),
    removeFavorite: (params) => ipcRenderer.invoke('user:removeFavorite', params),
    toggleFavorite: (params) => ipcRenderer.invoke('user:toggleFavorite', params),
    isLiked: (params) => ipcRenderer.invoke('user:isLiked', params),
    addLike: (params) => ipcRenderer.invoke('user:addLike', params),
    removeLike: (params) => ipcRenderer.invoke('user:removeLike', params)
  },
  app: {
    getPaths: () => ipcRenderer.invoke('app:getPaths'),
    openDataDirectory: () => ipcRenderer.invoke('app:openDataDirectory'),
    pickDataDirectoryParent: () => ipcRenderer.invoke('app:pickDataDirectoryParent'),
    migrateDataDirectory: (params) => ipcRenderer.invoke('app:migrateDataDirectory', params),
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
    showItemInFolder: (url) => ipcRenderer.invoke('shell:showItemInFolder', url),
    copyText: (text) => ipcRenderer.invoke('shell:copyText', text),
    pickImageFile: () => ipcRenderer.invoke('shell:pickImageFile'),
    savePngDataUrl: (params) => ipcRenderer.invoke('shell:savePngDataUrl', params),
    saveImageDataUrl: (params) => ipcRenderer.invoke('shell:saveImageDataUrl', params),
    saveTextFile: (params) => ipcRenderer.invoke('shell:saveTextFile', params)
  },
  share: {
    canNativeShare: () => ipcRenderer.invoke('share:canNativeShare'),
    nativeShare: (params) => ipcRenderer.invoke('share:nativeShare', params),
    uploadTemp: (params) => ipcRenderer.invoke('share:uploadTemp', params)
  }
}

contextBridge.exposeInMainWorld('wanwu', api)
