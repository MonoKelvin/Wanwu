import type { DiagramCommandErrorCode } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandPayloadMap } from '@modules/library/diagrams/app/command/domain/payloads'

export { ALL_DIAGRAM_COMMAND_IDS, isDiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
/** @deprecated 使用 isDiagramCommandId */
export { isDiagramCommandId as isDiagramCommandType } from '@modules/library/diagrams/app/command/domain/ids'
export type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'

/** @deprecated 使用 DiagramCommandId */
export type DiagramCommandType = DiagramCommandId

export interface DiagramCommandEnvelope<T extends DiagramCommandId = DiagramCommandId> {
  id?: string
  type: T
  payload?: T extends keyof DiagramCommandPayloadMap
    ? DiagramCommandPayloadMap[T]
    : IDiagramCommandParams
}

export type DiagramCommandResult =
  | { ok: true; data?: unknown }
  | { ok: false; code: DiagramCommandErrorCode; message: string }

export interface DiagramCommandContext {
  sessionId: string | null
  fileId: string | null
  activePageId: string | null
}

export function commandDomain(type: string): 'document' | 'page' | 'file' | 'catalog' | 'project' | null {
  if (type.startsWith('Diagram.Document.')) return 'document'
  if (type.startsWith('Diagram.Page.')) return 'page'
  if (type.startsWith('Diagram.File.')) return 'file'
  if (type.startsWith('Diagram.Catalog.')) return 'catalog'
  if (type.startsWith('Diagram.Project.')) return 'project'
  return null
}
