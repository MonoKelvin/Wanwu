import type { DiagramService } from './service'
import { DiagramCmd } from '../../../src/modules/library/diagrams/app/command/domain/ids'
import { DG_RECYCLE } from '../../../src/modules/library/diagrams/domain/diagramFolderIds'
import type { DiagramCommandEnvelope } from '../../../src/modules/library/diagrams/app/command/domain/types'
import type { DiagramCommandResult } from '../../../src/modules/library/diagrams/app/command/domain/types'
import { validateDiagramCommand } from './commandValidation'
import type { DiagramContent } from '../../../src/shared/types/diagrams'

export async function executeMainDiagramCommand(
  service: DiagramService,
  cmd: DiagramCommandEnvelope
): Promise<DiagramCommandResult> {
  const validation = validateDiagramCommand(cmd)
  if (validation) return validation

  const payload = cmd.payload ?? ({} as Record<string, unknown>)

  try {
    switch (cmd.type) {
      case DiagramCmd.Catalog.Folder.List:
        return { ok: true, data: service.listFolders() }
      case DiagramCmd.Catalog.Folder.Create:
        return { ok: true, data: service.createFolder(payload.name as string) }
      case DiagramCmd.Catalog.Folder.Rename:
        service.renameFolder(payload.folderId as string, payload.name as string)
        return { ok: true }
      case DiagramCmd.Catalog.Folder.Delete:
        service.deleteFolder(payload.folderId as string)
        return { ok: true }
      case DiagramCmd.Catalog.Folder.Reorder:
        service.reorderFolders(
          payload.orders as Array<{ folderId: string; sortOrder: number }>
        )
        return { ok: true }
      case DiagramCmd.Catalog.File.List: {
        const includeDeleted = payload.folderId === DG_RECYCLE
        return {
          ok: true,
          data: service.listFiles(payload.folderId as string, includeDeleted)
        }
      }
      case DiagramCmd.Catalog.File.Create:
        return {
          ok: true,
          data: await service.createFile(
            payload.folderId as string,
            payload.title as string,
            payload.content as DiagramContent | undefined
          )
        }
      case DiagramCmd.Catalog.File.Read: {
        const record = await service.readFile(payload.fileId as string)
        if (!record) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: record }
      }
      case DiagramCmd.Catalog.File.Rename: {
        const meta = await service.renameFile(payload.fileId as string, payload.title as string)
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case DiagramCmd.Catalog.File.Move: {
        const meta = service.moveFile(payload.fileId as string, payload.folderId as string)
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case DiagramCmd.Catalog.File.Duplicate: {
        const record = await service.duplicateFile(payload.fileId as string)
        if (!record) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: record }
      }
      case DiagramCmd.Catalog.File.SetPinned: {
        const meta = service.setFilePinned(payload.fileId as string, Boolean(payload.pinned))
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case DiagramCmd.Catalog.File.SoftDelete:
        if (!service.softDeleteFile(payload.fileId as string)) {
          return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        }
        return { ok: true }
      case DiagramCmd.Catalog.File.Purge:
        if (!service.purgeFile(payload.fileId as string)) {
          return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        }
        return { ok: true }
      case DiagramCmd.Catalog.File.Restore: {
        const meta = service.restoreFile(payload.fileId as string)
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      default:
        return { ok: false, code: 'UNKNOWN_COMMAND', message: `主进程不处理: ${cmd.type}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, code: 'INTERNAL', message }
  }
}

export function isMainProcessCommand(type: string): boolean {
  return type.startsWith('Diagram.Catalog.')
}

export function isRendererProcessCommand(type: string): boolean {
  return (
    type.startsWith('Diagram.Document.') ||
    type.startsWith('Diagram.Page.') ||
    type.startsWith('Diagram.File.') ||
    type.startsWith('Diagram.Project.')
  )
}
