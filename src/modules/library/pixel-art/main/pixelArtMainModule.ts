import { ipcMain } from 'electron'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { PIXEL_ART_MODULE_ID } from '@modules/library/pixel-art/domain/moduleId'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import { PixelArtService } from '@modules/library/pixel-art/main/service/service'
import type { PixelWritePatch } from '@modules/library/pixel-art/domain/types'
import {
  deserializePixelDocumentFromIpc,
  serializePixelDocumentForIpc
} from '@modules/library/pixel-art/lib/pixelIpcCodec'

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<PixelArtService>(ctx, PIXEL_ART_MODULE_ID)
}

export const pixelArtMainModule: IMainProcessModule = {
  id: PIXEL_ART_MODULE_ID,
  order: 14,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db) return
    setModuleRuntimeService(ctx, PIXEL_ART_MODULE_ID, new PixelArtService(db.getBasePath()))
  },

  onDispose(ctx) {
    getService(ctx)?.close()
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('pixel-art:listFolders', () => getService(ctx)?.listFolders() ?? [])
    ipcMain.handle('pixel-art:listFiles', (_e, params: { folderId: string }) => {
      const includeDeleted = params.folderId === 'pa-recycle'
      return getService(ctx)?.listFiles(params.folderId, includeDeleted) ?? []
    })
    ipcMain.handle('pixel-art:listRecentFiles', (_e, params?: { limit?: number }) => {
      return getService(ctx)?.listRecentFiles(params?.limit ?? 20) ?? []
    })
    ipcMain.handle('pixel-art:countRecycleFiles', () => getService(ctx)?.countRecycleFiles() ?? 0)
    ipcMain.handle('pixel-art:readFile', async (_e, params: { fileId: string }) => {
      const record = await getService(ctx)?.readFile(params.fileId)
      if (!record) return null
      return {
        meta: record.meta,
        content: serializePixelDocumentForIpc(record.content)
      }
    })
    ipcMain.handle(
      'pixel-art:writeFile',
      async (
        _e,
        params: {
          fileId: string
          content: ReturnType<typeof serializePixelDocumentForIpc>
          baseUpdatedAt: string
          force?: boolean
          patch?: PixelWritePatch
        }
      ) => {
        const content = deserializePixelDocumentFromIpc(params.content)
        return (
          (await getService(ctx)?.writeFile(
            params.fileId,
            content,
            params.baseUpdatedAt,
            params.force,
            params.patch
          )) ?? { ok: false, message: '服务不可用' }
        )
      }
    )
    ipcMain.handle(
      'pixel-art:createFile',
      async (
        _e,
        params: {
          folderId: string
          title: string
          width?: number
          height?: number
          content?: ReturnType<typeof serializePixelDocumentForIpc>
        }
      ) => {
        const content = params.content
          ? deserializePixelDocumentFromIpc(params.content)
          : undefined
        const record = await getService(ctx)?.createFile(
          params.folderId,
          params.title,
          params.width,
          params.height,
          content
        )
        if (!record) return null
        return { meta: record.meta, content: serializePixelDocumentForIpc(record.content) }
      }
    )
    ipcMain.handle('pixel-art:renameFile', (_e, params: { fileId: string; title: string }) =>
      getService(ctx)?.renameFile(params.fileId, params.title)
    )
    ipcMain.handle('pixel-art:moveFile', (_e, params: { fileId: string; folderId: string }) =>
      getService(ctx)?.moveFile(params.fileId, params.folderId)
    )
    ipcMain.handle('pixel-art:softDeleteFile', (_e, params: { fileId: string }) =>
      getService(ctx)?.softDeleteFile(params.fileId)
    )
    ipcMain.handle('pixel-art:restoreFile', (_e, params: { fileId: string }) =>
      getService(ctx)?.restoreFile(params.fileId)
    )
    ipcMain.handle('pixel-art:purgeFile', (_e, params: { fileId: string }) =>
      getService(ctx)?.purgeFile(params.fileId)
    )
    ipcMain.handle('pixel-art:createFolder', (_e, params: { name: string }) =>
      getService(ctx)?.createFolder(params.name)
    )
    ipcMain.handle('pixel-art:renameFolder', (_e, params: { folderId: string; name: string }) => {
      getService(ctx)?.renameFolder(params.folderId, params.name)
    })
    ipcMain.handle('pixel-art:deleteFolder', (_e, params: { folderId: string }) => {
      getService(ctx)?.deleteFolder(params.folderId)
    })
    ipcMain.handle('pixel-art:exportImage', (_e, params: unknown) =>
      getService(ctx)?.exportImageWithDialog(params as Parameters<PixelArtService['exportImageWithDialog']>[0])
    )
    ipcMain.handle('pixel-art:saveWppWithDialog', (_e, params: unknown) =>
      getService(ctx)?.saveWppWithDialog(params as Parameters<PixelArtService['saveWppWithDialog']>[0])
    )
    ipcMain.handle('pixel-art:executeCommands', async (_e, _params: { cmds: unknown[] }) => {
      return []
    })
  }
}
