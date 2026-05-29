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
  links: {
    listFolders: () => ipcRenderer.invoke('links:listFolders'),
    listBookmarks: (params) => ipcRenderer.invoke('links:listBookmarks', params),
    listAllBookmarks: () => ipcRenderer.invoke('links:listAllBookmarks'),
    listBrowserSources: () => ipcRenderer.invoke('links:listBrowserSources'),
    syncFromBrowser: (params) => ipcRenderer.invoke('links:syncFromBrowser', params),
    syncToBrowser: (params) => ipcRenderer.invoke('links:syncToBrowser', params),
    reorderBookmarks: (params) => ipcRenderer.invoke('links:reorderBookmarks', params),
    sync: () => ipcRenderer.invoke('links:sync'),
    createFolder: (input) => ipcRenderer.invoke('links:createFolder', input),
    deleteFolder: (input) => ipcRenderer.invoke('links:deleteFolder', input),
    createBookmark: (input) => ipcRenderer.invoke('links:createBookmark', input),
    updateBookmark: (input) => ipcRenderer.invoke('links:updateBookmark', input),
    softDeleteBookmark: (id) => ipcRenderer.invoke('links:softDeleteBookmark', id),
    restoreBookmark: (id) => ipcRenderer.invoke('links:restoreBookmark', id),
    permanentDeleteBookmark: (id) => ipcRenderer.invoke('links:permanentDeleteBookmark', id),
    probeUnreachable: (ids, onProgress) => {
      const progressChannel =
        onProgress ? `links:probe-progress:${crypto.randomUUID()}` : undefined
      const handler = (_: unknown, progress: { done: number; total: number }) => {
        onProgress?.(progress)
      }
      if (progressChannel && onProgress) {
        ipcRenderer.on(progressChannel, handler)
      }
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
  notes: {
    listNotes: () => ipcRenderer.invoke('notes:list'),
    createNote: (input) => ipcRenderer.invoke('notes:create', input),
    updateNote: (input) => ipcRenderer.invoke('notes:update', input),
    deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
    addImage: (params) => ipcRenderer.invoke('notes:addImage', params),
    removeImage: (imageId) => ipcRenderer.invoke('notes:removeImage', imageId),
    onChanged: (listener) => {
      const handler = (_: unknown, note: import('../src/shared/types/notes').NoteItem) =>
        listener(note)
      ipcRenderer.on('notes:changed', handler)
      return () => ipcRenderer.removeListener('notes:changed', handler)
    },
    onDeleted: (listener) => {
      const handler = (_: unknown, noteId: string) => listener(noteId)
      ipcRenderer.on('notes:deleted', handler)
      return () => ipcRenderer.removeListener('notes:deleted', handler)
    },
    onImageRemoved: (listener) => {
      const handler = (_: unknown, imageId: string) => listener(imageId)
      ipcRenderer.on('notes:image-removed', handler)
      return () => ipcRenderer.removeListener('notes:image-removed', handler)
    },
    popout: {
      open: (noteId, anchor) => ipcRenderer.invoke('notes:popout:open', noteId, anchor),
      close: (noteId, scrollTop) => ipcRenderer.invoke('notes:popout:close', noteId, scrollTop),
      toggle: (noteId, scrollTop, anchor) =>
        ipcRenderer.invoke('notes:popout:toggleVisibility', noteId, scrollTop, anchor),
      toggleVisibility: (noteId, scrollTop, anchor) =>
        ipcRenderer.invoke('notes:popout:toggleVisibility', noteId, scrollTop, anchor),
      hide: (noteId, scrollTop) => ipcRenderer.invoke('notes:popout:hide', noteId, scrollTop),
      show: (noteId) => ipcRenderer.invoke('notes:popout:show', noteId),
      isOpen: (noteId) => ipcRenderer.invoke('notes:popout:isOpen', noteId),
      isVisible: (noteId) => ipcRenderer.invoke('notes:popout:isVisible', noteId),
      listOpen: () => ipcRenderer.invoke('notes:popout:listOpen'),
      getBatchState: () => ipcRenderer.invoke('notes:popout:getBatchState'),
      toggleAllVisibility: () => ipcRenderer.invoke('notes:popout:toggleAllVisibility'),
      restore: () => ipcRenderer.invoke('notes:popout:restore'),
      rendererReady: () => ipcRenderer.send('notes:popout:renderer-ready'),
      saveScroll: (params) => ipcRenderer.invoke('notes:popout:saveScroll', params),
      closeCurrent: (scrollTop) => ipcRenderer.invoke('notes:popout:closeCurrent', scrollTop),
      toggleAlwaysOnTop: (noteId) =>
        ipcRenderer.invoke('notes:popout:toggleAlwaysOnTop', noteId),
      getAlwaysOnTop: (noteId) => ipcRenderer.invoke('notes:popout:getAlwaysOnTop', noteId),
      getVisibilityOverride: (noteId) =>
        ipcRenderer.invoke('notes:popout:getVisibilityOverride', noteId),
      onPopoutState: (listener) => {
        const handler = (
          _: unknown,
          payload: { noteId: string; open: boolean; visible: boolean }
        ) => listener(payload)
        ipcRenderer.on('notes:popout-state', handler)
        return () => ipcRenderer.removeListener('notes:popout-state', handler)
      },
      onRestoreScroll: (listener) => {
        const handler = (_: unknown, payload: { scrollTop: number }) => listener(payload)
        ipcRenderer.on('notes:popout-restore-scroll', handler)
        return () => ipcRenderer.removeListener('notes:popout-restore-scroll', handler)
      },
      onPopoutFocused: (listener) => {
        const handler = (_: unknown, payload: { noteId: string }) => listener(payload)
        ipcRenderer.on('notes:popout-focused', handler)
        return () => ipcRenderer.removeListener('notes:popout-focused', handler)
      }
    }
  },
  user: {
    getProfile: () => ipcRenderer.invoke('user:getProfile'),
    updateProfile: (profile) => ipcRenderer.invoke('user:updateProfile', profile),
    importProfileImage: (params) => ipcRenderer.invoke('user:importProfileImage', params),
    clearBackground: () => ipcRenderer.invoke('user:clearBackground'),
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
    getStartupNotices: () => ipcRenderer.invoke('app:getStartupNotices'),
    onStartupNotice: (listener: (message: string) => void) => {
      const handler = (_event: unknown, message: string) => listener(message)
      ipcRenderer.on('app:startup-notice', handler)
      return () => ipcRenderer.removeListener('app:startup-notice', handler)
    },
    openDataDirectory: () => ipcRenderer.invoke('app:openDataDirectory'),
    pickDataDirectoryParent: () => ipcRenderer.invoke('app:pickDataDirectoryParent'),
    migrateDataDirectory: (params) => ipcRenderer.invoke('app:migrateDataDirectory', params),
    getSettings: () => ipcRenderer.invoke('app:getSettings'),
    updateSettings: (settings: unknown) => ipcRenderer.invoke('app:updateSettings', settings),
    patchSettings: (patch: unknown) => ipcRenderer.invoke('app:patchSettings', patch),
    onAppSettingsChanged: (listener: (settings: unknown) => void) => {
      const handler = (_: unknown, settings: unknown) => listener(settings)
      ipcRenderer.on('app:settings-changed', handler)
      return () => ipcRenderer.removeListener('app:settings-changed', handler)
    },
    createBackup: () => ipcRenderer.invoke('app:createBackup'),
    restoreBackup: () => ipcRenderer.invoke('app:restoreBackup'),
    clearCache: () => ipcRenderer.invoke('app:clearCache'),
    resetSettings: () => ipcRenderer.invoke('app:resetSettings'),
    exportDiagnostics: () => ipcRenderer.invoke('app:exportDiagnostics')
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
    copyImage: (url) => ipcRenderer.invoke('shell:copyImage', url),
    pickImageFile: () => ipcRenderer.invoke('shell:pickImageFile'),
    savePngDataUrl: (params) => ipcRenderer.invoke('shell:savePngDataUrl', params),
    saveImageDataUrl: (params) => ipcRenderer.invoke('shell:saveImageDataUrl', params),
    saveClipboardImageDataUrlToTemp: (params) =>
      ipcRenderer.invoke('shell:saveClipboardImageDataUrlToTemp', params),
    saveTextFile: (params) => ipcRenderer.invoke('shell:saveTextFile', params),
    cacheImageForViewer: (url) => ipcRenderer.invoke('shell:cacheImageForViewer', url),
    releaseViewerImageCache: (cacheId) =>
      ipcRenderer.invoke('shell:releaseViewerImageCache', cacheId)
  },
  share: {
    canNativeShare: () => ipcRenderer.invoke('share:canNativeShare'),
    nativeShare: (params) => ipcRenderer.invoke('share:nativeShare', params),
    uploadTemp: (params) => ipcRenderer.invoke('share:uploadTemp', params)
  }
}

contextBridge.exposeInMainWorld('wanwu', api)
