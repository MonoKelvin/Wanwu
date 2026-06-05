import {
  DG_DRAFTS,
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId,
  isDiagramSystemFolderId
} from '../../../src/modules/library/diagrams/domain/diagramFolderIds'
import { isDiagramCommandType } from '../../../src/modules/library/diagrams/domain/commands/types'
import type { DiagramCommandEnvelope } from '../../../src/modules/library/diagrams/domain/commands/types'
import type { DiagramCommandResult } from '../../../src/modules/library/diagrams/domain/commands/types'

function fail(code: 'VALIDATION' | 'UNKNOWN_COMMAND', message: string): DiagramCommandResult {
  return { ok: false, code, message }
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function isWritableFolderId(folderId: string): boolean {
  if (folderId === DG_HOME || folderId === DG_RECYCLE) return false
  return isDiagramSystemFolderId(folderId) || isDiagramCustomFolderId(folderId)
}

export function validateDiagramCommand(cmd: DiagramCommandEnvelope): DiagramCommandResult | null {
  if (!isDiagramCommandType(cmd.type)) {
    return fail('UNKNOWN_COMMAND', `未知命令类型: ${cmd.type}`)
  }

  const payload = cmd.payload ?? {}

  switch (cmd.type) {
    case 'file.create': {
      const folderId = payload.folderId
      const title = payload.title
      if (!isNonEmptyString(folderId) || !isWritableFolderId(folderId)) {
        return fail('VALIDATION', '无效的 folderId')
      }
      if (!isNonEmptyString(title)) return fail('VALIDATION', 'title 不能为空')
      return null
    }
    case 'file.rename':
    case 'file.move':
    case 'file.softDelete':
    case 'file.restore':
    case 'file.purge':
    case 'file.read': {
      if (!isNonEmptyString(payload.fileId)) return fail('VALIDATION', 'fileId 不能为空')
      if (cmd.type === 'file.move' && !isNonEmptyString(payload.folderId)) {
        return fail('VALIDATION', 'folderId 不能为空')
      }
      if (cmd.type === 'file.move' && !isWritableFolderId(payload.folderId as string)) {
        return fail('VALIDATION', '无效的目标 folderId')
      }
      if (cmd.type === 'file.rename' && !isNonEmptyString(payload.title)) {
        return fail('VALIDATION', 'title 不能为空')
      }
      return null
    }
    case 'file.list': {
      if (!isNonEmptyString(payload.folderId)) return fail('VALIDATION', 'folderId 不能为空')
      if (payload.folderId === DG_HOME) return null
      if (!isDiagramSystemFolderId(payload.folderId) && !isDiagramCustomFolderId(payload.folderId)) {
        return fail('VALIDATION', '无效的 folderId')
      }
      return null
    }
    case 'folder.create': {
      if (!isNonEmptyString(payload.name)) return fail('VALIDATION', 'name 不能为空')
      return null
    }
    case 'folder.rename': {
      if (!isNonEmptyString(payload.folderId) || !isNonEmptyString(payload.name)) {
        return fail('VALIDATION', 'folderId 与 name 不能为空')
      }
      if (isDiagramSystemFolderId(payload.folderId)) {
        return fail('VALIDATION', '不能重命名系统分组')
      }
      return null
    }
    case 'folder.delete': {
      if (!isNonEmptyString(payload.folderId)) return fail('VALIDATION', 'folderId 不能为空')
      if (isDiagramSystemFolderId(payload.folderId)) {
        return fail('VALIDATION', '不能删除系统分组')
      }
      return null
    }
    case 'folder.reorder': {
      if (!Array.isArray(payload.orders)) return fail('VALIDATION', 'orders 必须为数组')
      return null
    }
    case 'folder.list':
      return null
    default:
      return null
  }
}

export function validateMainProcessCommands(
  cmds: DiagramCommandEnvelope[]
): DiagramCommandResult | null {
  for (const cmd of cmds) {
    const domain = cmd.type.split('.')[0]
    if (domain !== 'file' && domain !== 'folder') continue
    const err = validateDiagramCommand(cmd)
    if (err) return err
  }
  return null
}
