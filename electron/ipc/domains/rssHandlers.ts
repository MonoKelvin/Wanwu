import { ipcMain } from 'electron'
import type { AppServices } from '../types'

export function registerRssHandlers(services: AppServices): void {
  ipcMain.handle('rss:listGroups', () => services.rss?.listGroups() ?? [])
  ipcMain.handle('rss:createGroup', (_e, payload: { name?: string } | string) => {
    if (!services.rss) throw new Error('RSS 服务未就绪')
    const name = typeof payload === 'string' ? payload : payload?.name
    if (!name?.trim()) throw new Error('请填写分组名称')
    return services.rss.createGroup(name.trim())
  })
  ipcMain.handle('rss:renameGroup', (_e, { groupId, name }: { groupId: string; name: string }) => {
    services.rss?.renameGroup(groupId, name)
  })
  ipcMain.handle('rss:deleteGroup', (_e, { groupId }: { groupId: string }) => {
    services.rss?.deleteGroup(groupId)
  })
  ipcMain.handle('rss:listFeeds', () => services.rss?.listFeeds() ?? [])
  ipcMain.handle('rss:createFeed', (_e, input: unknown) => {
    return services.rss?.createFeed(input as Parameters<NonNullable<typeof services.rss>['createFeed']>[0])
  })
  ipcMain.handle('rss:updateFeed', (_e, input: unknown) => {
    return services.rss?.updateFeed(input as Parameters<NonNullable<typeof services.rss>['updateFeed']>[0])
  })
  ipcMain.handle('rss:moveFeed', (_e, { feedId, groupId, sortOrder }: { feedId: string; groupId: string; sortOrder?: number }) => {
    services.rss?.moveFeed(feedId, groupId, sortOrder)
  })
  ipcMain.handle('rss:softDeleteFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.softDeleteFeed(feedId)
  })
  ipcMain.handle('rss:restoreFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.restoreFeed(feedId)
  })
  ipcMain.handle('rss:permanentDeleteFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.permanentDeleteFeed(feedId)
  })
  ipcMain.handle('rss:emptyRecycleBin', () => {
    services.rss?.emptyRecycleBin()
  })
  ipcMain.handle('rss:probeFeed', (_e, { feedId }: { feedId: string }) => {
    return services.rss?.probeFeed(feedId)
  })
  ipcMain.handle(
    'rss:fetchFeed',
    (_e, { feedId, fetchLimit }: { feedId: string; fetchLimit?: number }) => {
      return services.rss?.fetchFeed(feedId, fetchLimit ?? 20)
    }
  )
  ipcMain.handle(
    'rss:listEntries',
    (_e, { feedId, limit, offset }: { feedId: string; limit?: number; offset?: number }) => {
      return services.rss?.listEntries(feedId, limit ?? 20, offset ?? 0) ?? { items: [], total: 0 }
    }
  )
}
