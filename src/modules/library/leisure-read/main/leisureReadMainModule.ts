import { ipcMain } from 'electron'
import type Database from 'better-sqlite3'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { LEISURE_READ_MODULE_ID } from '@modules/library/leisure-read/domain/moduleId'
import { LEISURE_READ_TAB_LABELS } from '@modules/library/leisure-read/domain/settings'
import { ensureLeisureReadSchema } from '@modules/library/leisure-read/main/schema'
import {
  createLeisureReadService,
  type LeisureReadService
} from '@modules/library/leisure-read/main/service'
import type {
  LeisureReadFavoriteInput,
  LeisureReadTabId,
  LeisureReadUpdateArticleSnippetsInput
} from '@modules/library/leisure-read/domain/types'

const QUICK_ACCESS_KIND = 'leisure-read'

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<LeisureReadService>(ctx, LEISURE_READ_MODULE_ID)
}

function tabLabel(tab: LeisureReadTabId): string {
  return LEISURE_READ_TAB_LABELS[tab]
}

export const leisureReadMainModule: IMainProcessModule = {
  id: LEISURE_READ_MODULE_ID,
  order: 5,

  initServices(ctx) {
    const dbHost = ctx.services.db as {
      withUserDatabase<T>(fn: (db: Database.Database) => T): T
    }
    const userData = ctx.services.userData as { getAppSettings(): Record<string, unknown> }
    if (!dbHost?.withUserDatabase || !userData?.getAppSettings) return
    setModuleRuntimeService(ctx, LEISURE_READ_MODULE_ID, createLeisureReadService(dbHost, userData))
  },

  registerDatabaseSchema(db) {
    ensureLeisureReadSchema(db)
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('leisureRead:fetch', (_e, params: { tab: LeisureReadTabId }) => {
      const service = getService(ctx)
      if (!service) throw new Error('闲读服务未就绪')
      return service.fetch(params.tab)
    })

    ipcMain.handle('leisureRead:listFavorites', (_e, params?: { tab?: LeisureReadTabId }) => {
      return getService(ctx)?.listFavorites(params?.tab) ?? []
    })

    ipcMain.handle('leisureRead:addFavorite', (_e, input: LeisureReadFavoriteInput) => {
      const service = getService(ctx)
      if (!service) throw new Error('闲读服务未就绪')
      return service.addFavorite(input)
    })

    ipcMain.handle('leisureRead:removeFavorite', (_e, params: { id: string }) => {
      return getService(ctx)?.removeFavorite(params.id) ?? false
    })

    ipcMain.handle(
      'leisureRead:updateArticleSnippets',
      (_e, input: LeisureReadUpdateArticleSnippetsInput) => {
        const service = getService(ctx)
        if (!service) throw new Error('闲读服务未就绪')
        return service.updateArticleSnippetRanges(input)
      }
    )

    ipcMain.handle(
      'leisureRead:isFavorite',
      (_e, params: { tab: LeisureReadTabId; contentId: string }) => {
        return getService(ctx)?.isFavorite(params.tab, params.contentId) ?? false
      }
    )

    ipcMain.handle(
      'leisureRead:searchFavorites',
      (_e, params: { query: string; limit?: number }) => {
        return getService(ctx)?.searchFavorites(params.query, params.limit) ?? []
      }
    )
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 6, order: 15 }
  },

  searchQuickAccess(ctx, query, limit) {
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    for (const fav of service.searchFavorites(query, limit)) {
      hits.push({
        kind: QUICK_ACCESS_KIND,
        id: fav.id,
        title: fav.title?.trim() || fav.body.slice(0, 48),
        subtitle: `闲读 · ${tabLabel(fav.tab)}`,
        payload: { tab: fav.tab, favoriteId: fav.id }
      })
    }
    return hits
  }
}
