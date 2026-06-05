import type {
  DiagramContent,
  DiagramFileMeta,
  DiagramFileRecord,
  DiagramFolder,
  WriteResult
} from '@shared/types/diagrams'

export interface IDiagramRepositoryPort {
  listFolders(): Promise<DiagramFolder[]>
  listFiles(folderId: string): Promise<DiagramFileMeta[]>
  listRecentFiles(limit?: number): Promise<DiagramFileMeta[]>
  readFile(fileId: string): Promise<DiagramFileRecord | null>
  writeFile(fileId: string, content: DiagramContent, baseUpdatedAt: string): Promise<WriteResult>
  createFile(folderId: string, title: string, content?: DiagramContent): Promise<DiagramFileRecord>
  renameFile(fileId: string, title: string): Promise<DiagramFileMeta | null>
  moveFile(fileId: string, folderId: string): Promise<DiagramFileMeta | null>
  softDeleteFile(fileId: string): Promise<void>
  restoreFile(fileId: string): Promise<void>
  purgeFile(fileId: string): Promise<void>
  createFolder(name: string): Promise<DiagramFolder>
  renameFolder(folderId: string, name: string): Promise<void>
  deleteFolder(folderId: string): Promise<void>
  reorderFolders(orders: Array<{ folderId: string; sortOrder: number }>): Promise<void>
}
