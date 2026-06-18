import { ipcMain } from 'electron'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { RSS_MODULE_ID } from '@modules/rss/domain/moduleId'
import type { DatabaseService } from '../../../../electron/services/core/database'
import { RssService } from './service/service'
import {
  applyRssAutoRefreshSchedule,
  bindRssSchedulerContext
} from './scheduler'

const QUICK_ACCESS_KIND = 'rss'

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<RssService>(ctx, RSS_MODULE_ID)
}

export const rssMainModule: IMainProcessModule = {
  id: RSS_MODULE_ID,
  order: 13,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db) return
    setModuleRuntimeService(ctx, RSS_MODULE_ID, new RssService(db.getBasePath()))
  },

  onModulesReady(ctx) {
    bindRssSchedulerContext(ctx)
    void getService(ctx)?.pruneUnhealthyDefaultFeeds().catch(() => {})
  },

  onSettingsChanged(ctx, settings) {
    bindRssSchedulerContext(ctx)
    applyRssAutoRefreshSchedule(settings)
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('rss:listGroups', () => getService(ctx)?.listGroups() ?? [])
    ipcMain.handle('rss:createGroup', (_e, payload: { name?: string } | string) => {
      const service = getService(ctx)
      if (!service) throw new Error('RSS 服务未就绪')
      const name = typeof payload === 'string' ? payload : payload?.name
      if (!name?.trim()) throw new Error('请填写分组名称')
      return service.createGroup(name.trim())
    })
    ipcMain.handle('rss:renameGroup', (_e, { groupId, name }: { groupId: string; name: string }) => {
      getService(ctx)?.renameGroup(groupId, name)
    })
    ipcMain.handle('rss:deleteGroup', (_e, { groupId }: { groupId: string }) => {
      getService(ctx)?.deleteGroup(groupId)
    })
    ipcMain.handle('rss:listFeeds', () => getService(ctx)?.listFeeds() ?? [])
    ipcMain.handle('rss:createFeed', (_e, input: unknown) => {
      return getService(ctx)?.createFeed(input as Parameters<NonNullable<RssService>['createFeed']>[0])
    })
    ipcMain.handle('rss:updateFeed', (_e, input: unknown) => {
      return getService(ctx)?.updateFeed(input as Parameters<NonNullable<RssService>['updateFeed']>[0])
    })
    ipcMain.handle(
      'rss:moveFeed',
      (_e, { feedId, groupId, sortOrder }: { feedId: string; groupId: string; sortOrder?: number }) => {
        getService(ctx)?.moveFeed(feedId, groupId, sortOrder)
      }
    )
    ipcMain.handle('rss:softDeleteFeed', (_e, { feedId }: { feedId: string }) => {
      getService(ctx)?.softDeleteFeed(feedId)
    })
    ipcMain.handle('rss:restoreFeed', (_e, { feedId }: { feedId: string }) => {
      getService(ctx)?.restoreFeed(feedId)
    })
    ipcMain.handle('rss:permanentDeleteFeed', (_e, { feedId }: { feedId: string }) => {
      getService(ctx)?.permanentDeleteFeed(feedId)
    })
    ipcMain.handle('rss:emptyRecycleBin', () => {
      getService(ctx)?.emptyRecycleBin()
    })
    ipcMain.handle('rss:probeFeed', (_e, { feedId }: { feedId: string }) => {
      return getService(ctx)?.probeFeed(feedId)
    })
    ipcMain.handle(
      'rss:fetchFeed',
      (_e, { feedId, fetchLimit }: { feedId: string; fetchLimit?: number }) => {
        return getService(ctx)?.fetchFeed(feedId, fetchLimit ?? 20)
      }
    )
    ipcMain.handle(
      'rss:listEntries',
      (_e, { feedId, limit, offset }: { feedId: string; limit?: number; offset?: number }) => {
        return getService(ctx)?.listEntries(feedId, limit ?? 20, offset ?? 0) ?? { items: [], total: 0 }
      }
    )
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 4, order: 50 }
  },

  searchQuickAccess(ctx, query, limit) {
    return getService(ctx)?.searchQuickAccess(query, limit) ?? []
  },

  getTrayStatusSlice(ctx) {
    return getService(ctx)?.getTrayStatusSlice() ?? { rssEntryCount: 0, rssFeedCount: 0 }
  }
}
