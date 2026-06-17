import type {
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/app/command/domain/types'
import type {
  DiagramContent,
  DiagramFileMeta,
  DiagramFileRecord,
  DiagramFolder,
  DiagramImportDrawioResult,
  DiagramImportNodeAssetResult,
  DiagramImportWfgResult,
  DiagramExportWfgResult,
  DiagramSaveNewResult,
  DiagramSearchHit,
  DiagramWritePatch,
  WriteResult
} from '@modules/library/diagrams/domain/types'

/** 流程图 IPC 能力块，通过模块 augmentation 合并进 WanwuApi */
export interface WanwuDiagramsApi {
  diagrams: {
    listFolders: () => Promise<DiagramFolder[]>
    listFiles: (params: { folderId: string }) => Promise<DiagramFileMeta[]>
    listRecentFiles: (params?: { limit?: number }) => Promise<DiagramFileMeta[]>
    searchFiles: (params: { query: string; limit?: number }) => Promise<DiagramSearchHit[]>
    countRecycleFiles: () => Promise<number>
    duplicateFile: (params: { fileId: string }) => Promise<DiagramFileRecord | null>
    setFilePinned: (params: { fileId: string; pinned: boolean }) => Promise<DiagramFileMeta | null>
    getFileContentPath: (params: { fileId: string }) => Promise<string | null>
    readFile: (params: { fileId: string }) => Promise<DiagramFileRecord | null>
    writeFile: (params: {
      fileId: string
      content: DiagramContent
      baseUpdatedAt: string
      force?: boolean
      patch?: DiagramWritePatch
    }) => Promise<WriteResult>
    importDrawio: () => Promise<DiagramImportDrawioResult>
    importDrawioAndCreate: (params: {
      folderId: string
    }) => Promise<DiagramFileRecord | { canceled: true } | null>
    importWfg: () => Promise<DiagramImportWfgResult>
    importWfgAndCreate: (params: {
      folderId: string
    }) => Promise<DiagramFileRecord | { canceled: true } | null>
    importWfgFromSource: (params: {
      folderId: string
      sourcePath: string
      content: DiagramContent
    }) => Promise<DiagramFileRecord | null>
    importNodeAsset: (params: {
      fileId: string
    }) => Promise<DiagramImportNodeAssetResult>
    exportWfg: (params: {
      fileId?: string | null
      content?: DiagramContent
      defaultName: string
    }) => Promise<DiagramExportWfgResult>
    createFile: (params: {
      folderId: string
      title: string
      content?: DiagramContent
    }) => Promise<DiagramFileRecord>
    saveNewWithDialog: (params: {
      folderId: string
      content: DiagramContent
      defaultName: string
    }) => Promise<DiagramSaveNewResult>
    renameFile: (params: { fileId: string; title: string }) => Promise<DiagramFileMeta | null>
    moveFile: (params: { fileId: string; folderId: string }) => Promise<DiagramFileMeta | null>
    softDeleteFile: (params: { fileId: string }) => Promise<boolean>
    restoreFile: (params: { fileId: string }) => Promise<DiagramFileMeta | null>
    purgeFile: (params: { fileId: string }) => Promise<boolean>
    createFolder: (params: { name: string }) => Promise<DiagramFolder>
    renameFolder: (params: { folderId: string; name: string }) => Promise<void>
    deleteFolder: (params: { folderId: string }) => Promise<void>
    reorderFolders: (params: { orders: Array<{ folderId: string; sortOrder: number }> }) => Promise<void>
    executeCommands: (
      cmds: DiagramCommandEnvelope[],
      options?: { stopOnError?: boolean }
    ) => Promise<DiagramCommandResult[]>
    onRunCommands: (
      listener: (payload: {
        requestId: string
        cmds: DiagramCommandEnvelope[]
      }) => void
    ) => () => void
    sendRunCommandsResult: (requestId: string, results: DiagramCommandResult[]) => void
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuDiagramsApi {}
}
