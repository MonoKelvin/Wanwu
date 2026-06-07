import { ipcMain } from 'electron'
import { registerDiagramCommandBridge } from '../diagramCommands'
import type { DiagramContent, DiagramWritePatch } from '../../../src/shared/types/diagrams'
import type { AppServices } from '../types'

export function registerDiagramsHandlers(services: AppServices): void {
  registerDiagramCommandBridge(() => services.diagrams)
  ipcMain.handle('diagrams:listFolders', () => services.diagrams?.listFolders() ?? [])
  ipcMain.handle('diagrams:listFiles', (_e, params: { folderId: string }) => {
    const includeDeleted = params.folderId === 'dg-recycle'
    return services.diagrams?.listFiles(params.folderId, includeDeleted) ?? []
  })
  ipcMain.handle('diagrams:listRecentFiles', (_e, params?: { limit?: number }) => {
    return services.diagrams?.listRecentFiles(params?.limit ?? 20) ?? []
  })
  ipcMain.handle('diagrams:searchFiles', (_e, params: { query: string; limit?: number }) => {
    return services.diagrams?.searchFiles(params.query, params.limit ?? 40) ?? []
  })
  ipcMain.handle('diagrams:countRecycleFiles', () => {
    return services.diagrams?.countRecycleFiles() ?? 0
  })
  ipcMain.handle('diagrams:duplicateFile', (_e, params: { fileId: string }) => {
    return services.diagrams?.duplicateFile(params.fileId) ?? null
  })
  ipcMain.handle('diagrams:setFilePinned', (_e, params: { fileId: string; pinned: boolean }) => {
    return services.diagrams?.setFilePinned(params.fileId, params.pinned) ?? null
  })
  ipcMain.handle('diagrams:getFileContentPath', (_e, params: { fileId: string }) => {
    return services.diagrams?.getFileContentPath(params.fileId) ?? null
  })
  ipcMain.handle('diagrams:readFile', (_e, params: { fileId: string }) => {
    return services.diagrams?.readFile(params.fileId) ?? null
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
      if (!services.diagrams) throw new Error('流程图服务未就绪')
      return services.diagrams.writeFile(
        params.fileId,
        params.content,
        params.baseUpdatedAt,
        params.force,
        params.patch
      )
    }
  )
  ipcMain.handle('diagrams:importDrawio', () => {
    if (!services.diagrams) throw new Error('流程图服务未就绪')
    return services.diagrams.importDrawio()
  })
  ipcMain.handle('diagrams:importDrawioAndCreate', (_e, params: { folderId: string }) => {
    if (!services.diagrams) throw new Error('流程图服务未就绪')
    return services.diagrams.importDrawioAndCreate(params.folderId)
  })
  ipcMain.handle('diagrams:importWfg', () => {
    if (!services.diagrams) throw new Error('流程图服务未就绪')
    return services.diagrams.importWfg()
  })
  ipcMain.handle('diagrams:importNodeAsset', (_e, params: { fileId: string }) => {
    if (!services.diagrams) throw new Error('流程图服务未就绪')
    return services.diagrams.importNodeAsset(params.fileId)
  })
  ipcMain.handle('diagrams:importWfgAndCreate', (_e, params: { folderId: string }) => {
    if (!services.diagrams) throw new Error('流程图服务未就绪')
    return services.diagrams.importWfgAndCreate(params.folderId)
  })
  ipcMain.handle(
    'diagrams:importWfgFromSource',
    (
      _e,
      params: { folderId: string; sourcePath: string; content: DiagramContent }
    ) => {
      if (!services.diagrams) throw new Error('流程图服务未就绪')
      return services.diagrams.importWfgFromSource(
        params.folderId,
        params.sourcePath,
        params.content
      )
    }
  )
  ipcMain.handle(
    'diagrams:exportWfg',
    (
      _e,
      params: { fileId?: string | null; content?: DiagramContent; defaultName: string }
    ) => {
      if (!services.diagrams) throw new Error('流程图服务未就绪')
      return services.diagrams.exportWfg(params)
    }
  )
  ipcMain.handle(
    'diagrams:createFile',
    (_e, params: { folderId: string; title: string; content?: DiagramContent }) => {
      if (!services.diagrams) throw new Error('流程图服务未就绪')
      return services.diagrams.createFile(params.folderId, params.title, params.content)
    }
  )
  ipcMain.handle(
    'diagrams:saveNewWithDialog',
    (
      _e,
      params: { folderId: string; content: DiagramContent; defaultName: string }
    ) => {
      if (!services.diagrams) throw new Error('流程图服务未就绪')
      return services.diagrams.saveNewWithDialog(params)
    }
  )
  ipcMain.handle('diagrams:renameFile', (_e, params: { fileId: string; title: string }) => {
    return services.diagrams?.renameFile(params.fileId, params.title) ?? null
  })
  ipcMain.handle('diagrams:moveFile', (_e, params: { fileId: string; folderId: string }) => {
    return services.diagrams?.moveFile(params.fileId, params.folderId) ?? null
  })
  ipcMain.handle('diagrams:softDeleteFile', (_e, params: { fileId: string }) => {
    return services.diagrams?.softDeleteFile(params.fileId) ?? false
  })
  ipcMain.handle('diagrams:restoreFile', (_e, params: { fileId: string }) => {
    return services.diagrams?.restoreFile(params.fileId) ?? null
  })
  ipcMain.handle('diagrams:purgeFile', (_e, params: { fileId: string }) => {
    return services.diagrams?.purgeFile(params.fileId) ?? false
  })
  ipcMain.handle('diagrams:createFolder', (_e, params: { name: string }) => {
    if (!services.diagrams) throw new Error('流程图服务未就绪')
    return services.diagrams.createFolder(params.name)
  })
  ipcMain.handle('diagrams:renameFolder', (_e, params: { folderId: string; name: string }) => {
    services.diagrams?.renameFolder(params.folderId, params.name)
  })
  ipcMain.handle('diagrams:deleteFolder', (_e, params: { folderId: string }) => {
    services.diagrams?.deleteFolder(params.folderId)
  })
  ipcMain.handle(
    'diagrams:reorderFolders',
    (_e, params: { orders: Array<{ folderId: string; sortOrder: number }> }) => {
      services.diagrams?.reorderFolders(params.orders)
    }
  )
}
