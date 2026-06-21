import { ipcMain } from 'electron'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { DIAGRAMS_MODULE_ID } from '@modules/library/diagrams/domain/moduleId'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import { DiagramService } from './service/service'
import { registerDiagramCommandBridge } from './diagramCommandBridge'
import { registerMediaPathResolver } from '../../../../../electron/app/mediaResolverBridge'
import { resolveDiagramMediaAbsolute } from './service/diagramMediaResolver'
import type { DiagramContent, DiagramWritePatch } from '@modules/library/diagrams/domain/types'

const QUICK_ACCESS_KIND = 'diagram'

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<DiagramService>(ctx, DIAGRAMS_MODULE_ID)
}

export const diagramsMainModule: IMainProcessModule = {
  id: DIAGRAMS_MODULE_ID,
  order: 12,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db) return
    setModuleRuntimeService(ctx, DIAGRAMS_MODULE_ID, new DiagramService(db.getBasePath()))
  },

  onModulesReady(ctx) {
    registerMediaPathResolver({
      id: `${DIAGRAMS_MODULE_ID}:diagrams`,
      order: 20,
      prefix: 'diagrams/',
      allowUrlWithoutFile: true,
      resolveAsync: (rel, layout) => resolveDiagramMediaAbsolute(rel, layout)
    })
    void getService(ctx)?.migrateStorageToWfg().catch((err) => {
      console.error('[wanwu:diagrams] 启动迁移失败', err)
    })
  },

  onDispose(ctx) {
    getService(ctx)?.close()
  },

  registerIpcHandlers(ctx) {
    registerDiagramCommandBridge(() => getService(ctx))
    ipcMain.handle('diagrams:listFolders', () => getService(ctx)?.listFolders() ?? [])
    ipcMain.handle('diagrams:listFiles', (_e, params: { folderId: string }) => {
      const includeDeleted = params.folderId === 'dg-recycle'
      return getService(ctx)?.listFiles(params.folderId, includeDeleted) ?? []
    })
    ipcMain.handle('diagrams:listRecentFiles', (_e, params?: { limit?: number }) => {
      return getService(ctx)?.listRecentFiles(params?.limit ?? 20) ?? []
    })
    ipcMain.handle('diagrams:searchFiles', (_e, params: { query: string; limit?: number }) => {
      return getService(ctx)?.searchFiles(params.query, params.limit ?? 40) ?? []
    })
    ipcMain.handle('diagrams:countRecycleFiles', () => getService(ctx)?.countRecycleFiles() ?? 0)
    ipcMain.handle('diagrams:duplicateFile', (_e, params: { fileId: string }) => {
      return getService(ctx)?.duplicateFile(params.fileId) ?? null
    })
    ipcMain.handle('diagrams:setFilePinned', (_e, params: { fileId: string; pinned: boolean }) => {
      return getService(ctx)?.setFilePinned(params.fileId, params.pinned) ?? null
    })
    ipcMain.handle('diagrams:getFileContentPath', (_e, params: { fileId: string }) => {
      return getService(ctx)?.getFileContentPath(params.fileId) ?? null
    })
    ipcMain.handle('diagrams:readFile', (_e, params: { fileId: string }) => {
      return getService(ctx)?.readFile(params.fileId) ?? null
    })
    ipcMain.handle(
      'diagrams:writeFile',
      (
        _e,
        params: {
          fileId: string
          content: DiagramContent
          baseUpdatedAt: string
          force?: boolean
          patch?: DiagramWritePatch
        }
      ) => {
        const service = getService(ctx)
        if (!service) throw new Error('流程图服务未就绪')
        return service.writeFile(
          params.fileId,
          params.content,
          params.baseUpdatedAt,
          params.force,
          params.patch
        )
      }
    )
    ipcMain.handle('diagrams:importDrawio', () => {
      const service = getService(ctx)
      if (!service) throw new Error('流程图服务未就绪')
      return service.importDrawio()
    })
    ipcMain.handle('diagrams:importDrawioAndCreate', (_e, params: { folderId: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('流程图服务未就绪')
      return service.importDrawioAndCreate(params.folderId)
    })
    ipcMain.handle('diagrams:importWfg', () => {
      const service = getService(ctx)
      if (!service) throw new Error('流程图服务未就绪')
      return service.importWfg()
    })
    ipcMain.handle('diagrams:importNodeAsset', (_e, params: { fileId: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('流程图服务未就绪')
      return service.importNodeAsset(params.fileId)
    })
    ipcMain.handle('diagrams:importWfgAndCreate', (_e, params: { folderId: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('流程图服务未就绪')
      return service.importWfgAndCreate(params.folderId)
    })
    ipcMain.handle(
      'diagrams:importWfgFromSource',
      (_e, params: { folderId: string; sourcePath: string; content: DiagramContent }) => {
        const service = getService(ctx)
        if (!service) throw new Error('流程图服务未就绪')
        return service.importWfgFromSource(params.folderId, params.sourcePath, params.content)
      }
    )
    ipcMain.handle(
      'diagrams:exportWfg',
      (_e, params: { fileId?: string | null; content?: DiagramContent; defaultName: string }) => {
        const service = getService(ctx)
        if (!service) throw new Error('流程图服务未就绪')
        return service.exportWfg(params)
      }
    )
    ipcMain.handle(
      'diagrams:createFile',
      (_e, params: { folderId: string; title: string; content?: DiagramContent }) => {
        const service = getService(ctx)
        if (!service) throw new Error('流程图服务未就绪')
        return service.createFile(params.folderId, params.title, params.content)
      }
    )
    ipcMain.handle(
      'diagrams:saveNewWithDialog',
      (_e, params: { folderId: string; content: DiagramContent; defaultName: string }) => {
        const service = getService(ctx)
        if (!service) throw new Error('流程图服务未就绪')
        return service.saveNewWithDialog(params)
      }
    )
    ipcMain.handle('diagrams:renameFile', (_e, params: { fileId: string; title: string }) => {
      return getService(ctx)?.renameFile(params.fileId, params.title) ?? null
    })
    ipcMain.handle('diagrams:moveFile', (_e, params: { fileId: string; folderId: string }) => {
      return getService(ctx)?.moveFile(params.fileId, params.folderId) ?? null
    })
    ipcMain.handle('diagrams:softDeleteFile', (_e, params: { fileId: string }) => {
      return getService(ctx)?.softDeleteFile(params.fileId) ?? false
    })
    ipcMain.handle('diagrams:restoreFile', (_e, params: { fileId: string }) => {
      return getService(ctx)?.restoreFile(params.fileId) ?? null
    })
    ipcMain.handle('diagrams:purgeFile', (_e, params: { fileId: string }) => {
      return getService(ctx)?.purgeFile(params.fileId) ?? false
    })
    ipcMain.handle('diagrams:createFolder', (_e, params: { name: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('流程图服务未就绪')
      return service.createFolder(params.name)
    })
    ipcMain.handle('diagrams:renameFolder', (_e, params: { folderId: string; name: string }) => {
      getService(ctx)?.renameFolder(params.folderId, params.name)
    })
    ipcMain.handle('diagrams:deleteFolder', (_e, params: { folderId: string }) => {
      getService(ctx)?.deleteFolder(params.folderId)
    })
    ipcMain.handle(
      'diagrams:reorderFolders',
      (_e, params: { orders: Array<{ folderId: string; sortOrder: number }> }) => {
        getService(ctx)?.reorderFolders(params.orders)
      }
    )
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 6, order: 30 }
  },

  async searchQuickAccess(ctx, query, limit) {
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    const rows = (await service.searchFiles(query, limit)) ?? []
    for (const row of rows) {
      hits.push({
        kind: QUICK_ACCESS_KIND,
        id: row.meta.id,
        title: row.meta.title.trim() || '未命名流程图',
        subtitle: row.matchedInContent ? '流程图 · 内容匹配' : '流程图',
        payload: { fileId: row.meta.id }
      })
    }
    return hits
  }
}
