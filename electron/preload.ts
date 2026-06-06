import { contextBridge, ipcRenderer } from 'electron'
import type { WanwuApi } from '../src/shared/types/api'
import type { AppSettings } from '../src/shared/types/settings'

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
  music: {
    search: (q, filter) => ipcRenderer.invoke('music:search', { q, filter }),
    resolveTrack: (track) => ipcRenderer.invoke('music:resolveTrack', { track }),
    getTrending: () => ipcRenderer.invoke('music:getTrending'),
    getCharts: () => ipcRenderer.invoke('music:getCharts'),
    getMoods: () => ipcRenderer.invoke('music:getMoods'),
    getMoodPlaylists: (categoryId) => ipcRenderer.invoke('music:getMoodPlaylists', { categoryId }),
    getPlaylistTracks: (playlistId) => ipcRenderer.invoke('music:getPlaylistTracks', { playlistId }),
    getForYou: () => ipcRenderer.invoke('music:getForYou'),
    getDiscoverFeed: () => ipcRenderer.invoke('music:getDiscoverFeed'),
    getDiscoverSection: (section) => ipcRenderer.invoke('music:getDiscoverSection', { section }),
    refreshDiscoverSection: (section) =>
      ipcRenderer.invoke('music:refreshDiscoverSection', { section }),
    getAlbum: (browseId) => ipcRenderer.invoke('music:getAlbum', { browseId }),
    getArtist: (browseId) => ipcRenderer.invoke('music:getArtist', { browseId }),
    getProviderHealth: () => ipcRenderer.invoke('music:getProviderHealth'),
    getLyrics: (title, artist, hint) =>
      ipcRenderer.invoke('music:getLyrics', { title, artist, ...hint }),
    resolveStream: (track, useCache, quality) =>
      ipcRenderer.invoke('music:resolveStream', { track, useCache, quality }),
    testConnection: () => ipcRenderer.invoke('music:testConnection'),
    getRadio: (videoId) => ipcRenderer.invoke('music:getRadio', { videoId }),
    listFavorites: () => ipcRenderer.invoke('music:listFavorites'),
    isFavorite: (trackKey) => ipcRenderer.invoke('music:isFavorite', { trackKey }),
    toggleFavorite: (track) => ipcRenderer.invoke('music:toggleFavorite', { track }),
    syncPlatformFavorites: (limit?: number) =>
      ipcRenderer.invoke('music:syncPlatformFavorites', { limit }),
    listHistory: (limit) => ipcRenderer.invoke('music:listHistory', { limit }),
    appendHistory: (track) => ipcRenderer.invoke('music:appendHistory', { track }),
    clearHistory: () => ipcRenderer.invoke('music:clearHistory'),
    neteaseGetLoginStatus: () => ipcRenderer.invoke('music:neteaseGetLoginStatus'),
    neteaseLoginQrKey: () => ipcRenderer.invoke('music:neteaseLoginQrKey'),
    neteaseLoginQrCheck: (key: string) => ipcRenderer.invoke('music:neteaseLoginQrCheck', { key }),
    neteaseSendCaptcha: (phone: string, countryCode?: number) =>
      ipcRenderer.invoke('music:neteaseSendCaptcha', { phone, countryCode }),
    neteaseLoginPhone: (phone: string, captcha: string, countryCode?: number) =>
      ipcRenderer.invoke('music:neteaseLoginPhone', { phone, captcha, countryCode }),
    neteaseLoginCookie: (musicU: string) => ipcRenderer.invoke('music:neteaseLoginCookie', { musicU }),
    neteaseLogout: () => ipcRenderer.invoke('music:neteaseLogout'),
    neteaseRefreshLogin: () => ipcRenderer.invoke('music:neteaseRefreshLogin'),
    kugouGetLoginStatus: () => ipcRenderer.invoke('music:kugouGetLoginStatus'),
    kugouLoginQrKey: () => ipcRenderer.invoke('music:kugouLoginQrKey'),
    kugouLoginQrCheck: (key: string) => ipcRenderer.invoke('music:kugouLoginQrCheck', { key }),
    kugouSendCaptcha: (phone: string, countryCode?: number) =>
      ipcRenderer.invoke('music:kugouSendCaptcha', { phone, countryCode }),
    kugouLoginPhone: (phone: string, captcha: string, countryCode?: number) =>
      ipcRenderer.invoke('music:kugouLoginPhone', { phone, captcha, countryCode }),
    kugouLoginCookie: (token: string) => ipcRenderer.invoke('music:kugouLoginCookie', { token }),
    kugouLogout: () => ipcRenderer.invoke('music:kugouLogout'),
    kugouRefreshLogin: () => ipcRenderer.invoke('music:kugouRefreshLogin'),
    neteaseSearchHot: (limit?: number) => ipcRenderer.invoke('music:neteaseSearchHot', { limit }),
    searchHot: (limit?: number) => ipcRenderer.invoke('music:searchHot', { limit }),
    neteaseSearchSuggest: (keywords: string) =>
      ipcRenderer.invoke('music:neteaseSearchSuggest', { keywords }),
    searchSuggest: (keywords: string) => ipcRenderer.invoke('music:searchSuggest', { keywords }),
    neteaseSearchDefault: () => ipcRenderer.invoke('music:neteaseSearchDefault'),
    searchDefault: () => ipcRenderer.invoke('music:searchDefault'),
    getDailyRecommend: () => ipcRenderer.invoke('music:getDailyRecommend'),
    getPersonalFm: () => ipcRenderer.invoke('music:getPersonalFm'),
    trashPersonalFm: (songId: string) => ipcRenderer.invoke('music:trashPersonalFm', { songId }),
    getNeteaseUserPlaylists: () => ipcRenderer.invoke('music:getNeteaseUserPlaylists'),
    getNeteaseLikedTracks: (limit?: number) => ipcRenderer.invoke('music:getNeteaseLikedTracks', { limit }),
    getNeteaseUserCloud: (limit?: number) => ipcRenderer.invoke('music:getNeteaseUserCloud', { limit }),
    getNeteaseArtistList: (limit?: number, offset?: number) => ipcRenderer.invoke('music:getNeteaseArtistList', { limit, offset }),
    getNeteaseNewAlbums: (limit?: number) => ipcRenderer.invoke('music:getNeteaseNewAlbums', { limit }),
    getPlatformSessionSnapshot: () => ipcRenderer.invoke('music:getPlatformSessionSnapshot'),
    getPlatformLoginStatus: () => ipcRenderer.invoke('music:getPlatformLoginStatus'),
    getPlatformUserProfile: () => ipcRenderer.invoke('music:getPlatformUserProfile'),
    refreshPlatformLogin: () => ipcRenderer.invoke('music:refreshPlatformLogin'),
    getPlatformUserPlaylists: () => ipcRenderer.invoke('music:getPlatformUserPlaylists'),
    getPlatformLikedTracks: (limit?: number) => ipcRenderer.invoke('music:getPlatformLikedTracks', { limit }),
    getPlatformUserCloud: (limit?: number) => ipcRenderer.invoke('music:getPlatformUserCloud', { limit }),
    getPlatformSubscribed: (kind, limit?: number) =>
      ipcRenderer.invoke('music:getPlatformSubscribed', { kind, limit }),
    platformLoginQrKey: () => ipcRenderer.invoke('music:platformLoginQrKey'),
    platformLoginQrCheck: (key: string) => ipcRenderer.invoke('music:platformLoginQrCheck', { key }),
    platformSendCaptcha: (phone: string, countryCode?: number) =>
      ipcRenderer.invoke('music:platformSendCaptcha', { phone, countryCode }),
    platformLoginPhone: (phone: string, captcha: string, countryCode?: number) =>
      ipcRenderer.invoke('music:platformLoginPhone', { phone, captcha, countryCode }),
    platformLoginCookie: (credential: string) =>
      ipcRenderer.invoke('music:platformLoginCookie', { credential }),
    platformLogout: () => ipcRenderer.invoke('music:platformLogout'),
    platformLikeSong: (songId: string, like: boolean) =>
      ipcRenderer.invoke('music:platformLikeSong', { songId, like }),
    getNewSongs: (limit?: number) => ipcRenderer.invoke('music:getNewSongs', { limit }),
    getNewAlbums: (limit?: number, seed?: number) =>
      ipcRenderer.invoke('music:getNewAlbums', { limit, seed }),
    getToplists: () => ipcRenderer.invoke('music:getToplists'),
    getToplistTracks: (toplistId: string, limit?: number) =>
      ipcRenderer.invoke('music:getToplistTracks', { toplistId, limit }),
    createPlatformPlaylist: (name: string) =>
      ipcRenderer.invoke('music:createPlatformPlaylist', { name }),
    deletePlatformPlaylist: (playlistId: string) =>
      ipcRenderer.invoke('music:deletePlatformPlaylist', { playlistId }),
    addPlatformPlaylistTracks: (playlistId: string, songIds: string[]) =>
      ipcRenderer.invoke('music:addPlatformPlaylistTracks', { playlistId, songIds }),
    removePlatformPlaylistTracks: (playlistId: string, songIds: string[]) =>
      ipcRenderer.invoke('music:removePlatformPlaylistTracks', { playlistId, songIds }),
    followPlatformArtist: (artistId: string, follow: boolean) =>
      ipcRenderer.invoke('music:followPlatformArtist', { artistId, follow }),
    getPlatformSongComments: (songId: string, page?: number) =>
      ipcRenderer.invoke('music:getPlatformSongComments', { songId, page }),
    getPlatformMvDetail: (browseId: string) =>
      ipcRenderer.invoke('music:getPlatformMvDetail', { browseId }),
    resolvePlatformMvStream: (mvId: string) =>
      ipcRenderer.invoke('music:resolvePlatformMvStream', { mvId }),
    getPlatformRadioCategories: () => ipcRenderer.invoke('music:getPlatformRadioCategories'),
    getPlatformRadioTracks: (categoryId: string, limit?: number) =>
      ipcRenderer.invoke('music:getPlatformRadioTracks', { categoryId, limit })
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
    onAppSettingsChanged: (listener: (settings: AppSettings) => void) => {
      const handler = (_: unknown, settings: AppSettings) => listener(settings)
      ipcRenderer.on('app:settings-changed', handler)
      return () => {
        ipcRenderer.removeListener('app:settings-changed', handler)
      }
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
    resolveClosePrompt: (choice: 'tray' | 'quit' | 'cancel') =>
      ipcRenderer.invoke('window:resolveClosePrompt', choice),
    onClosePrompt: (listener: () => void) => {
      const handler = () => listener()
      ipcRenderer.on('window:close-prompt', handler)
      return () => ipcRenderer.removeListener('window:close-prompt', handler)
    },
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
  cloudAbode: {
    getDashboard: () => ipcRenderer.invoke('cloud-abode:getDashboard'),
    listLedger: (limit) => ipcRenderer.invoke('cloud-abode:listLedger', limit),
    listProducts: (params) => ipcRenderer.invoke('cloud-abode:listProducts', params),
    getProduct: (id) => ipcRenderer.invoke('cloud-abode:getProduct', id),
    isProductOwned: (productId) => ipcRenderer.invoke('cloud-abode:isProductOwned', productId),
    ownsVehicleSlug: (slug) => ipcRenderer.invoke('cloud-abode:ownsVehicleSlug', slug),
    listInventory: () => ipcRenderer.invoke('cloud-abode:listInventory'),
    listCards: () => ipcRenderer.invoke('cloud-abode:listCards'),
    addCard: (input) => ipcRenderer.invoke('cloud-abode:addCard', input),
    setDefaultCard: (cardId) => ipcRenderer.invoke('cloud-abode:setDefaultCard', cardId),
    hasPaymentPassword: () => ipcRenderer.invoke('cloud-abode:hasPaymentPassword'),
    setPaymentPassword: (password) => ipcRenderer.invoke('cloud-abode:setPaymentPassword', password),
    checkout: (input) => ipcRenderer.invoke('cloud-abode:checkout', input),
    listTodos: () => ipcRenderer.invoke('cloud-abode:listTodos'),
    ensureDailyTodos: () => ipcRenderer.invoke('cloud-abode:ensureDailyTodos'),
    createUserTodo: (input) => ipcRenderer.invoke('cloud-abode:createUserTodo', input),
    completeTodo: (todoId) => ipcRenderer.invoke('cloud-abode:completeTodo', todoId),
    listTools: () => ipcRenderer.invoke('cloud-abode:listTools'),
    getToolRewardStatus: (toolId) => ipcRenderer.invoke('cloud-abode:getToolRewardStatus', toolId),
    invokeTool: (toolId) => ipcRenderer.invoke('cloud-abode:invokeTool', toolId),
    saveVehicleCustomization: (slug, lifeJson) =>
      ipcRenderer.invoke('cloud-abode:saveVehicleCustomization', slug, lifeJson),
    getVehicleCustomization: (slug) => ipcRenderer.invoke('cloud-abode:getVehicleCustomization', slug)
  },
  quickAccess: {
    search: (params) => ipcRenderer.invoke('quick-access:search', params),
    searchByKind: (params) => ipcRenderer.invoke('quick-access:searchByKind', params),
    getDailyPick: () => ipcRenderer.invoke('quick-access:getDailyPick'),
    getTrayStatus: () => ipcRenderer.invoke('quick-access:getTrayStatus'),
    showDailyWidget: () => ipcRenderer.invoke('quick-access:showDailyWidget'),
    hideDailyWidget: () => ipcRenderer.invoke('quick-access:hideDailyWidget'),
    openDailyInMain: () => ipcRenderer.invoke('quick-access:openDailyInMain'),
    getTrayMenuContext: () => ipcRenderer.invoke('quick-access:getTrayMenuContext'),
    trayMenuAction: (action) => ipcRenderer.invoke('quick-access:trayMenuAction', action),
    hideTrayMenu: () => ipcRenderer.invoke('quick-access:hideTrayMenu'),
    reportTrayMenuLayout: (size) => ipcRenderer.invoke('quick-access:reportTrayMenuLayout', size),
    onTrayMenuShow: (listener) => {
      const handler = () => listener()
      ipcRenderer.on('tray-menu:show', handler)
      return () => ipcRenderer.removeListener('tray-menu:show', handler)
    },
    onTogglePalette: (listener) => {
      const handler = () => listener()
      ipcRenderer.on('quick-access:toggle-palette', handler)
      return () => ipcRenderer.removeListener('quick-access:toggle-palette', handler)
    },
    onOpenTarget: (listener) => {
      const handler = (_: unknown, target: import('../src/shared/types/quickAccess').QuickAccessOpenTarget) =>
        listener(target)
      ipcRenderer.on('quick-access:open-target', handler)
      return () => ipcRenderer.removeListener('quick-access:open-target', handler)
    },
    onClipboardMatches: (listener) => {
      const handler = (_: unknown, payload: import('../src/shared/types/quickAccess').ClipboardAssistPayload) =>
        listener(payload)
      ipcRenderer.on('quick-access:clipboard-matches', handler)
      return () => ipcRenderer.removeListener('quick-access:clipboard-matches', handler)
    }
  },
  diagrams: {
    listFolders: () => ipcRenderer.invoke('diagrams:listFolders'),
    listFiles: (params) => ipcRenderer.invoke('diagrams:listFiles', params),
    listRecentFiles: (params) => ipcRenderer.invoke('diagrams:listRecentFiles', params),
    searchFiles: (params) => ipcRenderer.invoke('diagrams:searchFiles', params),
    duplicateFile: (params) => ipcRenderer.invoke('diagrams:duplicateFile', params),
    setFilePinned: (params) => ipcRenderer.invoke('diagrams:setFilePinned', params),
    getFileContentPath: (params) => ipcRenderer.invoke('diagrams:getFileContentPath', params),
    readFile: (params) => ipcRenderer.invoke('diagrams:readFile', params),
    writeFile: (params) => ipcRenderer.invoke('diagrams:writeFile', params),
    importDrawio: () => ipcRenderer.invoke('diagrams:importDrawio'),
    importDrawioAndCreate: (params) => ipcRenderer.invoke('diagrams:importDrawioAndCreate', params),
    importWfg: () => ipcRenderer.invoke('diagrams:importWfg'),
    importWfgAndCreate: (params) => ipcRenderer.invoke('diagrams:importWfgAndCreate', params),
    importWfgFromSource: (params) => ipcRenderer.invoke('diagrams:importWfgFromSource', params),
    importNodeAsset: (params) => ipcRenderer.invoke('diagrams:importNodeAsset', params),
    exportWfg: (params) => ipcRenderer.invoke('diagrams:exportWfg', params),
    createFile: (params) => ipcRenderer.invoke('diagrams:createFile', params),
    renameFile: (params) => ipcRenderer.invoke('diagrams:renameFile', params),
    moveFile: (params) => ipcRenderer.invoke('diagrams:moveFile', params),
    softDeleteFile: (params) => ipcRenderer.invoke('diagrams:softDeleteFile', params),
    restoreFile: (params) => ipcRenderer.invoke('diagrams:restoreFile', params),
    purgeFile: (params) => ipcRenderer.invoke('diagrams:purgeFile', params),
    createFolder: (params) => ipcRenderer.invoke('diagrams:createFolder', params),
    renameFolder: (params) => ipcRenderer.invoke('diagrams:renameFolder', params),
    deleteFolder: (params) => ipcRenderer.invoke('diagrams:deleteFolder', params),
    reorderFolders: (params) => ipcRenderer.invoke('diagrams:reorderFolders', params),
    executeCommands: (cmds, options) =>
      ipcRenderer.invoke('diagrams:executeCommands', { cmds, ...options }),
    onRunCommands: (listener) => {
      const handler = (
        _: unknown,
        payload: {
          requestId: string
          cmds: import('../src/modules/library/diagrams/domain/commands/types').DiagramCommandEnvelope[]
        }
      ) => listener(payload)
      ipcRenderer.on('diagrams:run-commands', handler)
      return () => ipcRenderer.removeListener('diagrams:run-commands', handler)
    },
    sendRunCommandsResult: (requestId, results) =>
      ipcRenderer.send('diagrams:run-commands-result', { requestId, results })
  },
  share: {
    canNativeShare: () => ipcRenderer.invoke('share:canNativeShare'),
    nativeShare: (params) => ipcRenderer.invoke('share:nativeShare', params),
    uploadTemp: (params) => ipcRenderer.invoke('share:uploadTemp', params)
  }
}

contextBridge.exposeInMainWorld('wanwu', api)
