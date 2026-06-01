import type { FavoriteEntry, FavoriteGroup } from './favorite'
import type { Category, Item, LibrarySearchHit } from './item'
import type {
  LinkBookmark,
  LinkFolder,
  BrowserSourceStatus,
  LinksProbeProgress,
  LinksProbeSummary,
  LinksSyncResult
} from './links'
import type { AppSettings } from './settings'
import type { RssEntry, RssFeed, RssFeedInput, RssFeedUpdate, RssGroup } from './rss'
import type {
  MusicChartsPayload,
  MusicConnectionTestResult,
  MusicFavoriteRow,
  MusicHistoryRow,
  MusicLyricsResult,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicProviderHealth,
  MusicArtistPayload,
  MusicSearchResult,
  MusicStreamResult,
  MusicTrendingPayload,
  NormalizedTrack
} from './music'
import type { NoteCreateInput, NoteImage, NoteItem, NoteUpdateInput } from './notes'
import type {
  ClipboardAssistPayload,
  DailyPickPreview,
  QuickAccessHit,
  QuickAccessHitKind,
  QuickAccessOpenTarget,
  QuickAccessTrayStatus
} from './quickAccess'
import type {
  CaCatalogListParams,
  CaCheckoutInput,
  CaDashboard,
  CaInventoryItem,
  CaLedgerEntry,
  CaOrder,
  CaProduct,
  CaTodo,
  CaToolInvokeResult,
  CaToolManifest,
  CaToolRewardStatus,
  CaVirtualCard
} from './cloud-abode'

export interface WanwuApi {
  library: {
    listCategories: () => Promise<Category[]>
    listItems: (params: { categoryId: string; subCategoryId?: string }) => Promise<Item[]>
    searchItems: (params: { query: string; limit?: number }) => Promise<LibrarySearchHit[]>
    getItem: (id: string) => Promise<Item | null>
    updateItem: (item: Item) => Promise<Item>
    createItem: (item: Partial<Item>) => Promise<Item>
    uploadItemImage: (params: { itemId: string; filePath: string }) => Promise<Item>
  }
  links: {
    listFolders: () => Promise<LinkFolder[]>
    listBookmarks: (params: { folderId: string; includeDeleted?: boolean }) => Promise<LinkBookmark[]>
    listAllBookmarks: () => Promise<LinkBookmark[]>
    listBrowserSources: () => Promise<BrowserSourceStatus[]>
    syncFromBrowser: (params: { browserSourceId: string }) => Promise<LinksSyncResult>
    syncToBrowser: (params: { browserSourceId: string }) => Promise<LinksSyncResult>
    reorderBookmarks: (params: { folderId: string; orderedIds: string[] }) => Promise<void>
    /** @deprecated 使用 syncFromBrowser / syncToBrowser */
    sync: () => Promise<LinksSyncResult>
    createFolder: (input: { parentId: string; name: string }) => Promise<LinkFolder>
    deleteFolder: (input: { folderId: string; moveBookmarksToRoot: boolean }) => Promise<void>
    createBookmark: (input: { folderId: string; title: string; url: string }) => Promise<LinkBookmark>
    updateBookmark: (input: {
      id: string
      title?: string
      url?: string
      folderId?: string
    }) => Promise<LinkBookmark | null>
    softDeleteBookmark: (id: string) => Promise<void>
    restoreBookmark: (id: string) => Promise<void>
    permanentDeleteBookmark: (id: string) => Promise<void>
    probeUnreachable: (
      ids: string[],
      onProgress?: (progress: LinksProbeProgress) => void
    ) => Promise<LinksProbeSummary>
    onBookmarksFileChanged: (
      listener: (payload: { browserSourceId: string }) => void
    ) => () => void
  }
  rss: {
    listGroups: () => Promise<RssGroup[]>
    createGroup: (name: string) => Promise<RssGroup>
    renameGroup: (groupId: string, name: string) => Promise<void>
    deleteGroup: (groupId: string) => Promise<void>
    listFeeds: () => Promise<RssFeed[]>
    createFeed: (input: RssFeedInput) => Promise<RssFeed>
    updateFeed: (input: RssFeedUpdate) => Promise<RssFeed>
    moveFeed: (feedId: string, groupId: string, sortOrder?: number) => Promise<void>
    softDeleteFeed: (feedId: string) => Promise<void>
    restoreFeed: (feedId: string) => Promise<void>
    permanentDeleteFeed: (feedId: string) => Promise<void>
    emptyRecycleBin: () => Promise<void>
    probeFeed: (feedId: string) => Promise<{ feedId: string; reachable: boolean; accessWarning: string | null }>
    fetchFeed: (feedId: string, fetchLimit?: number) => Promise<{ ok: boolean; count: number; total: number; error?: string }>
    listEntries: (
      feedId: string,
      limit?: number,
      offset?: number
    ) => Promise<{ items: RssEntry[]; total: number }>
  }
  notes: {
    listNotes: () => Promise<NoteItem[]>
    createNote: (input?: NoteCreateInput) => Promise<NoteItem>
    updateNote: (input: NoteUpdateInput) => Promise<NoteItem | null>
    deleteNote: (id: string) => Promise<boolean>
    addImage: (params: { noteId: string; filePath: string }) => Promise<NoteImage>
    removeImage: (imageId: string) => Promise<boolean>
    onChanged: (listener: (note: NoteItem) => void) => () => void
    onDeleted: (listener: (noteId: string) => void) => () => void
    onImageRemoved: (listener: (imageId: string) => void) => () => void
    popout: {
      open: (
        noteId: string,
        anchor?: { x: number; y: number }
      ) => Promise<{ open: boolean; visible: boolean }>
      close: (noteId: string, scrollTop?: number) => Promise<{ open: boolean; visible: boolean }>
      toggle: (
        noteId: string,
        scrollTop?: number,
        anchor?: { x: number; y: number }
      ) => Promise<{ open: boolean; visible: boolean }>
      toggleVisibility: (
        noteId: string,
        scrollTop?: number,
        anchor?: { x: number; y: number }
      ) => Promise<{ open: boolean; visible: boolean }>
      hide: (noteId: string, scrollTop?: number) => Promise<{ open: boolean; visible: boolean }>
      show: (noteId: string) => Promise<{ open: boolean; visible: boolean }>
      isOpen: (noteId: string) => Promise<boolean>
      isVisible: (noteId: string) => Promise<boolean>
      listOpen: () => Promise<string[]>
      getBatchState: () => Promise<{ scopeCount: number; openCount: number; visibleCount: number }>
      toggleAllVisibility: () => Promise<{ scopeCount: number; openCount: number; visibleCount: number }>
      restore: () => Promise<{ restoredCount: number }>
      rendererReady: () => void
      saveScroll: (params: { noteId: string; scrollTop: number }) => Promise<void>
      closeCurrent: (scrollTop?: number) => Promise<void>
      toggleAlwaysOnTop: (noteId: string) => Promise<{ alwaysOnTop: boolean }>
      getAlwaysOnTop: (noteId: string) => Promise<{ alwaysOnTop: boolean }>
      getVisibilityOverride: (
        noteId: string
      ) => Promise<{ visibilityOverride: 'user-hidden' | null }>
      onPopoutState: (
        listener: (payload: { noteId: string; open: boolean; visible: boolean }) => void
      ) => () => void
      onRestoreScroll: (listener: (payload: { scrollTop: number }) => void) => () => void
      onPopoutFocused: (listener: (payload: { noteId: string }) => void) => () => void
    }
  }
  user: {
    getProfile: () => Promise<{
      nickname: string
      bio: string
      avatarPath: string | null
      backgroundPath: string | null
      backgroundConfig: Record<string, unknown> | null
    } | null>
    updateProfile: (profile: {
      nickname: string
      bio: string
      avatarPath?: string | null
      backgroundPath?: string | null
      backgroundConfig?: Record<string, unknown> | null
    }) => Promise<void>
    importProfileImage: (params: {
      kind: 'avatar' | 'background'
      filePath: string
    }) => Promise<{ relativePath: string; url: string | null }>
    clearBackground: () => Promise<void>
    listFavorites: () => Promise<FavoriteEntry[]>
    listFavoriteGroups: () => Promise<FavoriteGroup[]>
    listFavoriteGroupsForPicker: () => Promise<Array<{ id: string; name: string; sortOrder: number }>>
    createFavoriteGroup: (name: string) => Promise<{ id: string; name: string; sortOrder: number }>
    isFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    addFavorite: (params: { itemId: string; source: string; groupId: string }) => Promise<boolean>
    removeFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    toggleFavorite: (params: { itemId: string; source: string }) => Promise<boolean>
    isLiked: (params: { itemId: string; source: string }) => Promise<boolean>
    addLike: (params: { itemId: string; source: string }) => Promise<boolean>
    removeLike: (params: { itemId: string; source: string }) => Promise<boolean>
  }
  app: {
    getPaths: () => Promise<{
      userData: string
      wanwu: string
      defaultWanwu: string
      isCustom: boolean
    }>
    getStartupNotices: () => Promise<string[]>
    /** 图鉴 bootstrap 完成后推送（如导入失败提示） */
    onStartupNotice: (listener: (message: string) => void) => () => void
    openDataDirectory: () => Promise<{ ok: boolean }>
    pickDataDirectoryParent: () => Promise<
      | { ok: true; parentDir: string; targetPath: string }
      | { ok: false; canceled?: boolean; error?: string }
    >
    migrateDataDirectory: (params: {
      parentDir: string
      overwriteExisting?: boolean
    }) => Promise<
      | { ok: true; targetPath: string }
      | { ok: false; error: string; code?: string }
    >
    getSettings: () => Promise<AppSettings>
    updateSettings: (settings: AppSettings) => Promise<AppSettings>
    patchSettings: (patch: Partial<AppSettings>) => Promise<AppSettings>
    onAppSettingsChanged: (listener: (settings: AppSettings) => void) => () => void
    createBackup: () => Promise<
      | { ok: true; path: string; bytes: number }
      | { ok: false; canceled?: boolean; error?: string }
    >
    restoreBackup: () => Promise<{ ok: true } | { ok: false; canceled?: boolean; error?: string }>
    clearCache: () => Promise<{ ok: true; bytesFreed: number }>
    resetSettings: () => Promise<AppSettings>
    exportDiagnostics: () => Promise<
      | { ok: true; path: string }
      | { ok: false; canceled?: boolean; error?: string }
    >
  }
  window: {
    getPlatform: () => Promise<'win32' | 'darwin' | 'linux'>
    minimize: () => Promise<void>
    toggleMaximize: () => Promise<boolean>
    isMaximized: () => Promise<boolean>
    close: () => Promise<void>
    resolveClosePrompt: (choice: 'tray' | 'quit' | 'cancel') => Promise<void>
    onClosePrompt: (listener: () => void) => () => void
    onMaximizedChange: (listener: (maximized: boolean) => void) => () => void
  }
  shell: {
    openExternal: (url: string) => Promise<void>
    downloadFile: (params: {
      url: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    showItemInFolder: (pathOrUrl: string) => Promise<{ ok: boolean; error?: string }>
    copyText: (text: string) => Promise<void>
    copyImage: (url: string) => Promise<{ ok: boolean; error?: string }>
    pickImageFile: () => Promise<{ ok: boolean; path?: string; canceled?: boolean }>
    savePngDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveImageDataUrl: (params: {
      dataUrl: string
      defaultName?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    saveClipboardImageDataUrlToTemp: (params: {
      dataUrl: string
    }) => Promise<{ ok: boolean; path?: string; error?: string }>
    saveTextFile: (params: {
      content: string
      defaultName?: string
      extension?: string
    }) => Promise<{ ok: boolean; path?: string; canceled?: boolean; error?: string }>
    /** 大图查看：本地直链或远程临时缓存 */
    cacheImageForViewer: (url: string) => Promise<{
      ok: boolean
      displayUrl?: string
      cacheId?: number
      error?: string
    }>
    releaseViewerImageCache: (cacheId: number) => Promise<void>
  }
  cloudAbode: {
    getDashboard: () => Promise<CaDashboard | null>
    listLedger: (limit?: number) => Promise<CaLedgerEntry[]>
    listProducts: (params?: CaCatalogListParams) => Promise<CaProduct[]>
    getProduct: (id: string) => Promise<CaProduct | null>
    isProductOwned: (productId: string) => Promise<boolean>
    ownsVehicleSlug: (slug: string) => Promise<boolean>
    listInventory: () => Promise<CaInventoryItem[]>
    listCards: () => Promise<CaVirtualCard[]>
    addCard: (input: { cardNumber: string; alias: string }) => Promise<CaVirtualCard>
    setDefaultCard: (cardId: string) => Promise<void>
    hasPaymentPassword: () => Promise<boolean>
    setPaymentPassword: (password: string) => Promise<void>
    checkout: (input: CaCheckoutInput) => Promise<CaOrder>
    listTodos: () => Promise<CaTodo[]>
    ensureDailyTodos: () => Promise<void>
    createUserTodo: (input: {
      title: string
      description?: string
      priority: 'high' | 'medium' | 'low'
      dueDate?: string | null
      rewardCents: number
    }) => Promise<CaTodo>
    completeTodo: (todoId: string) => Promise<{ todo: CaTodo; balanceCents: number }>
    listTools: () => Promise<CaToolManifest[]>
    getToolRewardStatus: (toolId: string) => Promise<CaToolRewardStatus>
    invokeTool: (toolId: string) => Promise<CaToolInvokeResult>
    saveVehicleCustomization: (slug: string, lifeJson: Record<string, unknown>) => Promise<void>
    getVehicleCustomization: (slug: string) => Promise<Record<string, unknown> | null>
  }
  quickAccess: {
    search: (params: { query: string; limit?: number }) => Promise<QuickAccessHit[]>
    searchByKind: (params: {
      kind: QuickAccessHitKind
      query: string
    }) => Promise<QuickAccessHit[]>
    getDailyPick: () => Promise<DailyPickPreview | null>
    getTrayStatus: () => Promise<QuickAccessTrayStatus>
    showDailyWidget: () => Promise<void>
    hideDailyWidget: () => Promise<void>
    openDailyInMain: () => Promise<void>
    getTrayMenuContext: () => Promise<import('@shared/types/trayMenu').TrayMenuContext>
    trayMenuAction: (action: import('@shared/types/trayMenu').TrayMenuAction) => Promise<void>
    hideTrayMenu: () => Promise<void>
    reportTrayMenuLayout: (size: { width: number; height: number }) => Promise<void>
    onTrayMenuShow: (listener: () => void) => () => void
    onTogglePalette: (listener: () => void) => () => void
    onOpenTarget: (listener: (target: QuickAccessOpenTarget) => void) => () => void
    onClipboardMatches: (listener: (payload: ClipboardAssistPayload) => void) => () => void
  }
  music: {
    search: (q: string, filter?: string) => Promise<MusicSearchResult>
    resolveTrack: (track: NormalizedTrack) => Promise<NormalizedTrack>
    getTrending: () => Promise<MusicTrendingPayload>
    getCharts: () => Promise<MusicChartsPayload>
    getMoods: () => Promise<MusicMoodCategory[]>
    getMoodPlaylists: (categoryId: string) => Promise<MusicMoodPlaylist[]>
    getPlaylistTracks: (playlistId: string) => Promise<NormalizedTrack[]>
    getForYou: () => Promise<NormalizedTrack[]>
    getDiscoverFeed: () => Promise<import('./music').MusicDiscoverFeed>
    getDiscoverSection: <K extends import('./music').DiscoverSectionKey>(
      section: K
    ) => Promise<import('./music').MusicDiscoverFeed[K]>
    refreshDiscoverSection: <K extends import('./music').DiscoverSectionKey>(
      section: K
    ) => Promise<import('./music').MusicDiscoverFeed[K]>
    getAlbum: (browseId: string) => Promise<{ album: unknown; tracks: NormalizedTrack[] }>
    getArtist: (browseId: string) => Promise<import('./music').MusicArtistPayload>
    getProviderHealth: () => Promise<import('./music').MusicProviderHealth[]>
    getLyrics: (
      title: string,
      artist: string,
      hint?: Pick<import('@shared/types/music').NormalizedTrack, 'provider' | 'videoId' | 'trackKey'>
    ) => Promise<MusicLyricsResult>
    resolveStream: (
      track: NormalizedTrack,
      useCache?: boolean,
      quality?: import('./settings').AppSettings['musicNeteaseQuality']
    ) => Promise<MusicStreamResult>
    testConnection: () => Promise<MusicConnectionTestResult>
    getRadio: (videoId: string) => Promise<NormalizedTrack[]>
    listFavorites: () => Promise<MusicFavoriteRow[]>
    isFavorite: (trackKey: string) => Promise<boolean>
    toggleFavorite: (track: NormalizedTrack) => Promise<boolean>
    syncPlatformFavorites: (limit?: number) => Promise<void>
    listHistory: (limit?: number) => Promise<MusicHistoryRow[]>
    appendHistory: (track: NormalizedTrack) => Promise<void>
    clearHistory: () => Promise<void>
    neteaseGetLoginStatus: () => Promise<import('./music').MusicNeteaseLoginStatus>
    neteaseLoginQrKey: () => Promise<import('./music').MusicNeteaseQrLogin>
    neteaseLoginQrCheck: (key: string) => Promise<{ status: number; message?: string; cookie?: string }>
    neteaseSendCaptcha: (phone: string, countryCode?: number) => Promise<unknown>
    neteaseLoginPhone: (phone: string, captcha: string, countryCode?: number) => Promise<unknown>
    neteaseLoginCookie: (musicU: string) => Promise<import('./music').MusicNeteaseLoginStatus>
    neteaseLogout: () => Promise<void>
    neteaseRefreshLogin: () => Promise<import('./music').MusicNeteaseLoginStatus>
    kugouGetLoginStatus: () => Promise<import('./music').MusicKugouLoginStatus>
    kugouLoginQrKey: () => Promise<import('./music').MusicKugouQrLogin>
    kugouLoginQrCheck: (key: string) => Promise<{ status: number; message?: string; cookie?: string }>
    kugouSendCaptcha: (phone: string, countryCode?: number) => Promise<unknown>
    kugouLoginPhone: (phone: string, captcha: string, countryCode?: number) => Promise<unknown>
    kugouLoginCookie: (token: string) => Promise<import('./music').MusicKugouLoginStatus>
    kugouLogout: () => Promise<void>
    kugouRefreshLogin: () => Promise<import('./music').MusicKugouLoginStatus>
    neteaseSearchHot: (limit?: number) => Promise<import('./music').MusicHotSearchEntry[]>
    searchHot: (limit?: number) => Promise<import('./music').MusicHotSearchEntry[]>
    neteaseSearchSuggest: (keywords: string) => Promise<Array<{ keyword: string; type?: string }>>
    searchSuggest: (keywords: string) => Promise<Array<{ keyword: string; type?: string }>>
    neteaseSearchDefault: () => Promise<string>
    searchDefault: () => Promise<string>
    getDailyRecommend: () => Promise<NormalizedTrack[]>
    getPersonalFm: () => Promise<NormalizedTrack[]>
    trashPersonalFm: (songId: string) => Promise<void>
    getNeteaseUserPlaylists: () => Promise<
      Array<{ id: string; title: string; coverUrl?: string; trackCount?: number; creatorName?: string }>
    >
    getNeteaseLikedTracks: (limit?: number) => Promise<NormalizedTrack[]>
    getNeteaseUserCloud: (limit?: number) => Promise<NormalizedTrack[]>
    getNeteaseArtistList: (limit?: number, offset?: number) => Promise<MusicSearchResult['artists']>
    getNeteaseNewAlbums: (limit?: number) => Promise<MusicSearchResult['albums']>
    getPlatformSessionSnapshot: () => Promise<import('./music').MusicPlatformSessionSnapshot>
    getPlatformLoginStatus: () => Promise<import('./music').MusicNeteaseLoginStatus>
    getPlatformUserProfile: () => Promise<import('./music').MusicPlatformUserProfile>
    refreshPlatformLogin: () => Promise<import('./music').MusicNeteaseLoginStatus>
    getPlatformUserPlaylists: () => Promise<
      Array<{ id: string; title: string; coverUrl?: string; trackCount?: number; creatorName?: string }>
    >
    getPlatformLikedTracks: (limit?: number) => Promise<NormalizedTrack[]>
    getPlatformUserCloud: (limit?: number) => Promise<NormalizedTrack[]>
    getPlatformSubscribed: (
      kind: import('./music').MusicPlatformSubscribedKind,
      limit?: number
    ) => Promise<import('./music').MusicPlatformSubscribedItem[]>
    platformLoginQrKey: () => Promise<import('./music').MusicNeteaseQrLogin>
    platformLoginQrCheck: (key: string) => Promise<{ status: number; message?: string; cookie?: string }>
    platformSendCaptcha: (phone: string, countryCode?: number) => Promise<unknown>
    platformLoginPhone: (phone: string, captcha: string, countryCode?: number) => Promise<unknown>
    platformLoginCookie: (credential: string) => Promise<import('./music').MusicNeteaseLoginStatus>
    platformLogout: () => Promise<void>
    platformLikeSong: (songId: string, like: boolean) => Promise<void>
    getNewSongs: (limit?: number) => Promise<NormalizedTrack[]>
    getNewAlbums: (limit?: number, seed?: number) => Promise<MusicSearchResult['albums']>
    getToplists: () => Promise<Array<{ id: string; title: string; coverUrl?: string; updateFrequency?: string }>>
    getToplistTracks: (toplistId: string, limit?: number) => Promise<NormalizedTrack[]>
    createPlatformPlaylist: (name: string) => Promise<{ id: string; title: string; coverUrl?: string }>
    deletePlatformPlaylist: (playlistId: string) => Promise<void>
    addPlatformPlaylistTracks: (playlistId: string, songIds: string[]) => Promise<void>
    removePlatformPlaylistTracks: (playlistId: string, songIds: string[]) => Promise<void>
    followPlatformArtist: (artistId: string, follow: boolean) => Promise<void>
    getPlatformSongComments: (songId: string, page?: number) => Promise<import('./music').MusicSongCommentPage>
    getPlatformMvDetail: (browseId: string) => Promise<import('./music').MusicMvDetail | null>
    resolvePlatformMvStream: (mvId: string) => Promise<{ url: string; format: string } | null>
    getPlatformRadioCategories: () => Promise<import('./music').MusicRadioCategory[]>
    getPlatformRadioTracks: (categoryId: string, limit?: number) => Promise<NormalizedTrack[]>
  }
  share: {
    canNativeShare: () => Promise<boolean>
    nativeShare: (params: {
      title?: string
      text?: string
      dataUrl?: string
      textContent?: string
      fileName: string
    }) => Promise<{ ok: boolean; canceled?: boolean; error?: string }>
    uploadTemp: (params: {
      dataUrl?: string
      textContent?: string
      fileName: string
      expire?: '1h' | '12h' | '24h' | '72h'
    }) => Promise<
      | { ok: true; url: string; expire: string; expiresInHours: number }
      | { ok: false; error: string }
    >
  }
}
