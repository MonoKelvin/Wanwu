import type { RssEntry, RssFeed, RssFeedInput, RssFeedUpdate, RssGroup } from '@modules/rss/domain/types'

/** RSS IPC 能力块，通过模块 augmentation 合并进 WanwuApi */
export interface WanwuRssApi {
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
    fetchFeed: (
      feedId: string,
      fetchLimit?: number
    ) => Promise<{ ok: boolean; count: number; total: number; error?: string }>
    listEntries: (
      feedId: string,
      limit?: number,
      offset?: number
    ) => Promise<{ items: RssEntry[]; total: number }>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuRssApi {}
}
