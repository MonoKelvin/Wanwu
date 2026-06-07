import type { DiagramContent } from '@shared/types/diagrams'

export const FILE_COMMAND_TYPES = [
  'file.create',
  'file.rename',
  'file.move',
  'file.duplicate',
  'file.setPinned',
  'file.softDelete',
  'file.restore',
  'file.purge',
  'file.list',
  'file.read'
] as const

export type FileCommandType = (typeof FILE_COMMAND_TYPES)[number]

export interface FileCreatePayload {
  folderId: string
  title: string
  content?: DiagramContent
}

export interface FileRenamePayload {
  fileId: string
  title: string
}

export interface FileMovePayload {
  fileId: string
  folderId: string
}

export interface FileSoftDeletePayload {
  fileId: string
}

export interface FileRestorePayload {
  fileId: string
}

export interface FilePurgePayload {
  fileId: string
}

export interface FileListPayload {
  folderId: string
}

export interface FileReadPayload {
  fileId: string
}

export interface FileDuplicatePayload {
  fileId: string
}

export interface FileSetPinnedPayload {
  fileId: string
  pinned: boolean
}
