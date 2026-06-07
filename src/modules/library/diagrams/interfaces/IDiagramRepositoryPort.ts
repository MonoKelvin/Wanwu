import type {
  DiagramContent,
  DiagramExportWfgResult,
  DiagramImportWfgResult,
  DiagramSaveNewResult,
  DiagramFileMeta,
  DiagramFileRecord,
  DiagramFolder,
  DiagramWritePatch,
  WriteResult
} from '@shared/types/diagrams'

export interface IDiagramRepositoryPort {
  listFolders(): Promise<DiagramFolder[]>
  listFiles(folderId: string): Promise<DiagramFileMeta[]>
  listRecentFiles(limit?: number): Promise<DiagramFileMeta[]>
  readFile(fileId: string): Promise<DiagramFileRecord | null>
  writeFile(
    fileId: string,
    content: DiagramContent,
    baseUpdatedAt: string,
    force?: boolean,
    patch?: DiagramWritePatch
  ): Promise<WriteResult>
  importWfg(): Promise<DiagramImportWfgResult>
  importWfgFromSource(
    folderId: string,
    sourcePath: string,
    content: DiagramContent
  ): Promise<DiagramFileRecord | null>
  importDrawio(): Promise<import('@shared/types/diagrams').DiagramImportDrawioResult>
  exportWfg(input: {
    fileId?: string | null
    content?: DiagramContent
    defaultName: string
  }): Promise<DiagramExportWfgResult>
  createFile(folderId: string, title: string, content?: DiagramContent): Promise<DiagramFileRecord>
  saveNewWithDialog(input: {
    folderId: string
    content: DiagramContent
    defaultName: string
  }): Promise<DiagramSaveNewResult>
  renameFile(fileId: string, title: string): Promise<DiagramFileMeta | null>
  moveFile(fileId: string, folderId: string): Promise<DiagramFileMeta | null>
  duplicateFile(fileId: string): Promise<DiagramFileRecord | null>
  setFilePinned(fileId: string, pinned: boolean): Promise<DiagramFileMeta | null>
  softDeleteFile(fileId: string): Promise<boolean>
  restoreFile(fileId: string): Promise<DiagramFileMeta | null>
  purgeFile(fileId: string): Promise<boolean>
  createFolder(name: string): Promise<DiagramFolder>
  renameFolder(folderId: string, name: string): Promise<void>
  deleteFolder(folderId: string): Promise<void>
  reorderFolders(orders: Array<{ folderId: string; sortOrder: number }>): Promise<void>
}
