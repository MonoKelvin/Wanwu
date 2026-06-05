import type { DiagramCommandErrorCode } from '@modules/library/diagrams/app/diagramCommandErrors'
import { CANVAS_COMMAND_TYPES, type CanvasCommandType } from './canvas'
import { DOCUMENT_COMMAND_TYPES, type DocumentCommandType } from './document'
import { FILE_COMMAND_TYPES, type FileCommandType } from './file'
import { FOLDER_COMMAND_TYPES, type FolderCommandType } from './folder'
import { PAGE_COMMAND_TYPES, type PageCommandType } from './page'

export const DIAGRAM_COMMAND_TYPES = [
  ...CANVAS_COMMAND_TYPES,
  ...PAGE_COMMAND_TYPES,
  ...DOCUMENT_COMMAND_TYPES,
  ...FILE_COMMAND_TYPES,
  ...FOLDER_COMMAND_TYPES
] as const

export type DiagramCommandType =
  | CanvasCommandType
  | PageCommandType
  | DocumentCommandType
  | FileCommandType
  | FolderCommandType

export interface DiagramCommandEnvelope {
  id?: string
  type: DiagramCommandType
  payload?: Record<string, unknown>
}

export type DiagramCommandResult =
  | { ok: true; data?: unknown }
  | { ok: false; code: DiagramCommandErrorCode; message: string }

export interface DiagramCommandContext {
  sessionId: string | null
  fileId: string | null
  activePageId: string | null
}

export function isDiagramCommandType(type: string): type is DiagramCommandType {
  return (DIAGRAM_COMMAND_TYPES as readonly string[]).includes(type)
}

export function commandDomain(type: string): 'canvas' | 'page' | 'document' | 'file' | 'folder' | null {
  if (type.startsWith('canvas.')) return 'canvas'
  if (type.startsWith('page.')) return 'page'
  if (type.startsWith('document.')) return 'document'
  if (type.startsWith('file.')) return 'file'
  if (type.startsWith('folder.')) return 'folder'
  return null
}
