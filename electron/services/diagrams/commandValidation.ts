import {
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId,
  isDiagramSystemFolderId
} from '../../../src/modules/library/diagrams/domain/diagramFolderIds'
import { DiagramCmd } from '../../../src/modules/library/diagrams/app/command/domain/ids'
import { isDiagramCommandId } from '../../../src/modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandEnvelope } from '../../../src/modules/library/diagrams/app/command/domain/types'
import type { DiagramCommandResult } from '../../../src/modules/library/diagrams/app/command/domain/types'

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
  if (!isDiagramCommandId(cmd.type)) {
    return fail('UNKNOWN_COMMAND', `未知命令类型: ${cmd.type}`)
  }

  const payload = cmd.payload ?? ({} as Record<string, unknown>)

  switch (cmd.type) {
    case DiagramCmd.Catalog.File.Create: {
      const folderId = payload.folderId
      const title = payload.title
      if (!isNonEmptyString(folderId) || !isWritableFolderId(folderId)) {
        return fail('VALIDATION', '无效的 folderId')
      }
      if (!isNonEmptyString(title)) return fail('VALIDATION', 'title 不能为空')
      return null
    }
    case DiagramCmd.Catalog.File.Rename:
    case DiagramCmd.Catalog.File.Move:
    case DiagramCmd.Catalog.File.Duplicate:
    case DiagramCmd.Catalog.File.SetPinned:
    case DiagramCmd.Catalog.File.SoftDelete:
    case DiagramCmd.Catalog.File.Restore:
    case DiagramCmd.Catalog.File.Purge:
    case DiagramCmd.Catalog.File.Read: {
      if (!isNonEmptyString(payload.fileId)) return fail('VALIDATION', 'fileId 不能为空')
      if (cmd.type === DiagramCmd.Catalog.File.Move && !isNonEmptyString(payload.folderId)) {
        return fail('VALIDATION', 'folderId 不能为空')
      }
      if (
        cmd.type === DiagramCmd.Catalog.File.Move &&
        !isWritableFolderId(payload.folderId as string)
      ) {
        return fail('VALIDATION', '无效的目标 folderId')
      }
      if (cmd.type === DiagramCmd.Catalog.File.Rename && !isNonEmptyString(payload.title)) {
        return fail('VALIDATION', 'title 不能为空')
      }
      if (cmd.type === DiagramCmd.Catalog.File.SetPinned && typeof payload.pinned !== 'boolean') {
        return fail('VALIDATION', 'pinned 必须为 boolean')
      }
      return null
    }
    case DiagramCmd.Catalog.File.List: {
      if (!isNonEmptyString(payload.folderId)) return fail('VALIDATION', 'folderId 不能为空')
      if (payload.folderId === DG_HOME) return null
      if (
        !isDiagramSystemFolderId(payload.folderId as string) &&
        !isDiagramCustomFolderId(payload.folderId as string)
      ) {
        return fail('VALIDATION', '无效的 folderId')
      }
      return null
    }
    case DiagramCmd.Catalog.Folder.Create: {
      if (!isNonEmptyString(payload.name)) return fail('VALIDATION', 'name 不能为空')
      return null
    }
    case DiagramCmd.Catalog.Folder.Rename: {
      if (!isNonEmptyString(payload.folderId) || !isNonEmptyString(payload.name)) {
        return fail('VALIDATION', 'folderId 与 name 不能为空')
      }
      if (isDiagramSystemFolderId(payload.folderId as string)) {
        return fail('VALIDATION', '不能重命名系统分组')
      }
      return null
    }
    case DiagramCmd.Catalog.Folder.Delete: {
      if (!isNonEmptyString(payload.folderId)) return fail('VALIDATION', 'folderId 不能为空')
      if (isDiagramSystemFolderId(payload.folderId as string)) {
        return fail('VALIDATION', '不能删除系统分组')
      }
      return null
    }
    case DiagramCmd.Catalog.Folder.Reorder: {
      if (!Array.isArray(payload.orders)) return fail('VALIDATION', 'orders 必须为数组')
      return null
    }
    case DiagramCmd.Catalog.Folder.List:
      return null
    default:
      return null
  }
}

export function validateMainProcessCommands(
  cmds: DiagramCommandEnvelope[]
): DiagramCommandResult | null {
  for (const cmd of cmds) {
    if (!cmd.type.startsWith('Diagram.Catalog.')) continue
    const err = validateDiagramCommand(cmd)
    if (err) return err
  }
  return null
}
