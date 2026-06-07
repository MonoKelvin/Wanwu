import type { DiagramService } from './service'
import type { DiagramCommandEnvelope } from '../../../src/modules/library/diagrams/domain/commands/types'
import type { DiagramCommandResult } from '../../../src/modules/library/diagrams/domain/commands/types'
import { validateDiagramCommand } from './commandValidation'
import type { DiagramContent } from '../../../src/shared/types/diagrams'

export async function executeMainDiagramCommand(
  service: DiagramService,
  cmd: DiagramCommandEnvelope
): Promise<DiagramCommandResult> {
  const validation = validateDiagramCommand(cmd)
  if (validation) return validation

  const payload = cmd.payload ?? {}

  try {
    switch (cmd.type) {
      case 'folder.list':
        return { ok: true, data: service.listFolders() }
      case 'folder.create':
        return { ok: true, data: service.createFolder(payload.name as string) }
      case 'folder.rename':
        service.renameFolder(payload.folderId as string, payload.name as string)
        return { ok: true }
      case 'folder.delete':
        service.deleteFolder(payload.folderId as string)
        return { ok: true }
      case 'folder.reorder':
        service.reorderFolders(payload.orders as Array<{ folderId: string; sortOrder: number }>)
        return { ok: true }
      case 'file.list': {
        const includeDeleted = payload.folderId === 'dg-recycle'
        return {
          ok: true,
          data: service.listFiles(payload.folderId as string, includeDeleted)
        }
      }
      case 'file.create':
        return {
          ok: true,
          data: await service.createFile(
            payload.folderId as string,
            payload.title as string,
            payload.content as DiagramContent | undefined
          )
        }
      case 'file.read': {
        const record = await service.readFile(payload.fileId as string)
        if (!record) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: record }
      }
      case 'file.rename': {
        const meta = await service.renameFile(payload.fileId as string, payload.title as string)
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case 'file.move': {
        const meta = service.moveFile(payload.fileId as string, payload.folderId as string)
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case 'file.duplicate': {
        const record = await service.duplicateFile(payload.fileId as string)
        if (!record) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: record }
      }
      case 'file.setPinned': {
        const meta = service.setFilePinned(payload.fileId as string, Boolean(payload.pinned))
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case 'file.softDelete':
        if (!service.softDeleteFile(payload.fileId as string)) {
          return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        }
        return { ok: true }
      case 'file.restore': {
        const meta = service.restoreFile(payload.fileId as string)
        if (!meta) return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        return { ok: true, data: meta }
      }
      case 'file.purge':
        if (!service.purgeFile(payload.fileId as string)) {
          return { ok: false, code: 'NOT_FOUND', message: '文件不存在' }
        }
        return { ok: true }
      default:
        return { ok: false, code: 'UNKNOWN_COMMAND', message: `主进程不处理: ${cmd.type}` }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, code: 'INTERNAL', message }
  }
}

export function isMainProcessCommand(type: string): boolean {
  return type.startsWith('file.') || type.startsWith('folder.')
}

export function isRendererProcessCommand(type: string): boolean {
  return type.startsWith('canvas.') || type.startsWith('page.') || type.startsWith('document.')
}
