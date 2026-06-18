import { ipcMain } from 'electron'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { ILLUSTRATED_HANDBOOK_MODULE_ID } from '@modules/library/illustrated-handbook/domain/moduleId'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import {
  registerOptionalModuleHooks,
  waitForLibraryBootstrap
} from '../../../../../electron/app/frameworkLifecycleBridge'
import { registerMediaResolverHooks } from '../../../../../electron/app/mediaResolverBridge'
import { resolveLibraryMediaAbsolute } from './service/mediaResolver'
import { LibraryDatabaseHost } from './libraryDatabaseHost'
import { LibraryService } from './service/service'
import { runStartupLibrarySeed } from './service/seed'
import {
  consumeStartupNotices as consumeStartupNoticesImpl,
  startLibraryBootstrap,
  waitForLibraryBootstrap as waitForLibraryBootstrapImpl
} from './service/pack'

const QUICK_ACCESS_KIND = 'library'

let handbookDbHost: LibraryDatabaseHost | null = null

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<LibraryService>(ctx, ILLUSTRATED_HANDBOOK_MODULE_ID)
}

export const illustratedHandbookMainModule: IMainProcessModule = {
  id: ILLUSTRATED_HANDBOOK_MODULE_ID,
  order: 1,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db) return
    handbookDbHost = new LibraryDatabaseHost(db.getBasePath())
    setModuleRuntimeService(ctx, ILLUSTRATED_HANDBOOK_MODULE_ID, new LibraryService(handbookDbHost))
  },

  onModulesReady() {
    if (!handbookDbHost) return
    registerOptionalModuleHooks({
      waitForLibraryBootstrap: () => waitForLibraryBootstrapImpl(),
      consumeStartupNotices: () => consumeStartupNoticesImpl()
    })
    registerMediaResolverHooks({
      resolveHandbookMediaAbsolute: (rel) => resolveLibraryMediaAbsolute(rel)
    })
    startLibraryBootstrap(handbookDbHost, () => runStartupLibrarySeed(handbookDbHost!))
  },

  onDispose() {
    handbookDbHost?.closeAllLibraryDbs()
    handbookDbHost = null
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('library:listCategories', () => getService(ctx)?.listCategories() ?? [])
    ipcMain.handle('library:listItems', async (_e, params: { categoryId: string; subCategoryId?: string }) => {
      await waitForLibraryBootstrap()
      return getService(ctx)?.listItems(params.categoryId, params.subCategoryId) ?? []
    })
    ipcMain.handle('library:searchItems', async (_e, params: { query: string; limit?: number }) => {
      await waitForLibraryBootstrap()
      return getService(ctx)?.searchItems(params.query, params.limit) ?? []
    })
    ipcMain.handle('library:getItem', async (_e, id: string) => {
      await waitForLibraryBootstrap()
      return getService(ctx)?.getItem(id) ?? null
    })
    ipcMain.handle('library:updateItem', (_e, item: unknown) => {
      return getService(ctx)?.updateItem(
        item as Parameters<NonNullable<LibraryService>['updateItem']>[0]
      )
    })
    ipcMain.handle('library:createItem', (_e, item: unknown) => {
      return getService(ctx)?.createItem(
        item as Parameters<NonNullable<LibraryService>['createItem']>[0]
      )
    })
    ipcMain.handle('library:uploadItemImage', (_e, params: { itemId: string; filePath: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('库服务未就绪')
      return service.uploadItemImage(params.itemId, params.filePath)
    })
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 8, order: 0 }
  },

  async searchQuickAccess(ctx, query, limit) {
    await waitForLibraryBootstrap()
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    for (const row of service.searchItems(query, limit)) {
      hits.push({
        kind: QUICK_ACCESS_KIND,
        id: row.id,
        title: row.name,
        subtitle: [row.categoryName, row.subCategoryName].filter(Boolean).join(' · ') || null,
        itemSource: 'library',
        itemId: row.id
      })
    }
    return hits
  },

  async getTrayStatusSlice(ctx) {
    await waitForLibraryBootstrap()
    return { daily: getService(ctx)?.pickDailyItem() ?? null }
  },

  async getClipboardAssistHints(ctx, text, limit) {
    const term = text.trim()
    if (term.length < 2 || term.length > 120) return []
    await waitForLibraryBootstrap()
    const service = getService(ctx)
    if (!service) return []
    return service.searchItems(term, limit).map((row) => ({
      kind: QUICK_ACCESS_KIND as const,
      id: row.id,
      title: row.name,
      subtitle: row.categoryName,
      itemSource: 'library' as const,
      itemId: row.id
    }))
  }
}
