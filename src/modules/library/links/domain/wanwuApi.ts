import type {
  BrowserSourceStatus,
  LinkBookmark,
  LinkFolder,
  LinksProbeProgress,
  LinksProbeSummary,
  LinksSyncResult
} from '@modules/library/links/domain/types'

/** 链接 IPC 能力块，通过模块 augmentation 合并进 WanwuApi */
export interface WanwuLinksApi {
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
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuLinksApi {}
}
