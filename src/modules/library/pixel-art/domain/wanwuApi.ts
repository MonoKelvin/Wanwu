import type {
  PixelCommandEnvelope,
  PixelCommandResult
} from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
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
    searchFiles: (params: { query: string; limit?: number }) => Promise<import('@modules/library/pixel-art/domain/types').PixelSearchHit[]>
    countRecycleFiles: () => Promise<number>
    getFileContentPath: (params: { fileId: string }) => Promise<string | null>
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
      contentPath?: string
    }) => Promise<PixelFileRecordDto>
    renameFile: (params: { fileId: string; title: string }) => Promise<PixelFileMeta | null>
    softDeleteFile: (params: { fileId: string }) => Promise<boolean>
    restoreFile: (params: { fileId: string }) => Promise<PixelFileMeta | null>
    purgeFile: (params: { fileId: string }) => Promise<boolean>
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
    pickWppSavePath: (params: { defaultName: string }) => Promise<PixelExportResult>
    executeCommands: (
      cmds: PixelCommandEnvelope[],
      options?: { stopOnError?: boolean }
    ) => Promise<PixelCommandResult[]>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuPixelArtApi {}
}
