import { contextBridge, ipcRenderer } from 'electron'
import type { WanwuApi } from '../src/shared/types/api'

const api: WanwuApi = {
  library: {
    listCategories: () => ipcRenderer.invoke('library:listCategories'),
    listItems: (params) => ipcRenderer.invoke('library:listItems', params),
    getItem: (id) => ipcRenderer.invoke('library:getItem', id),
    updateItem: (item) => ipcRenderer.invoke('library:updateItem', item),
    createItem: (item) => ipcRenderer.invoke('library:createItem', item)
  },
  custom: {
    checkDuplicate: (name) => ipcRenderer.invoke('custom:checkDuplicate', { name }),
    listCategories: () => ipcRenderer.invoke('custom:listCategories'),
    listItems: (params) => ipcRenderer.invoke('custom:listItems', params)
  },
  rss: {
    listFeeds: () => ipcRenderer.invoke('rss:listFeeds'),
    fetchFeed: (feedId) => ipcRenderer.invoke('rss:fetchFeed', { feedId }),
    listEntries: (feedId) => ipcRenderer.invoke('rss:listEntries', { feedId })
  },
  user: {
    getProfile: () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: (profile) => ipcRenderer.invoke('user:updateProfile', profile),
    listFavorites: () => ipcRenderer.invoke('user:listFavorites'),
    toggleFavorite: (params) => ipcRenderer.invoke('user:toggleFavorite', params)
  },
  app: {
    getPaths: () => ipcRenderer.invoke('app:getPaths')
  }
}

contextBridge.exposeInMainWorld('wanwu', api)
