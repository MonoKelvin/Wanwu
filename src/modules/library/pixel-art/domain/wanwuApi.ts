import type {
  PixelCommandEnvelope,
  PixelCommandResult
} from '@modules/library/pixel-art/app/command/domain/types'
import type { PixelDocumentDto } from '@modules/library/pixel-art/lib/pixelIpcCodec'
import type {
  ExportImageOptions,
  PixelExportResult,
  PixelFileMeta,
  PixelFolder,
  PixelWritePatch,
  WriteResult
} from '@modules/library/pixel-art/domain/types'

export interface PixelFileRecordDto {
  meta: PixelFileMeta
  content: PixelDocumentDto
}

export interface WanwuPixelArtApi {
  pixelArt: {
    listFolders: () => Promise<PixelFolder[]>
    listFiles: (params: { folderId: string }) => Promise<PixelFileMeta[]>
    listRecentFiles: (params?: { limit?: number }) => Promise<PixelFileMeta[]>
    countRecycleFiles: () => Promise<number>
    readFile: (params: { fileId: string }) => Promise<PixelFileRecordDto | null>
    writeFile: (params: {
      fileId: string
      content: PixelDocumentDto
      baseUpdatedAt: string
      force?: boolean
      patch?: PixelWritePatch
    }) => Promise<WriteResult>
    createFile: (params: {
      folderId: string
      title: string
      width?: number
      height?: number
      content?: PixelDocumentDto
    }) => Promise<PixelFileRecordDto>
    renameFile: (params: { fileId: string; title: string }) => Promise<PixelFileMeta | null>
    moveFile: (params: { fileId: string; folderId: string }) => Promise<PixelFileMeta | null>
    softDeleteFile: (params: { fileId: string }) => Promise<boolean>
    restoreFile: (params: { fileId: string }) => Promise<PixelFileMeta | null>
    purgeFile: (params: { fileId: string }) => Promise<boolean>
    createFolder: (params: { name: string }) => Promise<PixelFolder>
    renameFolder: (params: { folderId: string; name: string }) => Promise<void>
    deleteFolder: (params: { folderId: string }) => Promise<void>
    exportImage: (params: {
      defaultName: string
      format: ExportImageOptions['format']
      dataBase64?: string
      svgContent?: string
      jpegQuality?: number
    }) => Promise<PixelExportResult>
    saveWppWithDialog: (params: {
      defaultName: string
      fileId?: string
      content?: PixelDocumentDto
    }) => Promise<PixelExportResult>
    executeCommands: (
      cmds: PixelCommandEnvelope[],
      options?: { stopOnError?: boolean }
    ) => Promise<PixelCommandResult[]>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuPixelArtApi {}
}
