import type {
  PixelDocument,
  PixelFileMeta,
  PixelFileRecord,
  PixelFolder,
  PixelWritePatch,
  WriteResult
} from '@modules/library/pixel-art/domain/types'
import type { PixelDocumentDto } from '@modules/library/pixel-art/lib/pixelIpcCodec'
import {
  deserializePixelDocumentFromIpc,
  serializePixelDocumentForIpc
} from '@modules/library/pixel-art/lib/pixelIpcCodec'

export class PixelRepositoryIpcAdapter {
  listFolders(): Promise<PixelFolder[]> {
    return window.wanwu.pixelArt.listFolders()
  }

  listFiles(folderId: string): Promise<PixelFileMeta[]> {
    return window.wanwu.pixelArt.listFiles({ folderId })
  }

  listRecentFiles(limit = 12): Promise<PixelFileMeta[]> {
    return window.wanwu.pixelArt.listRecentFiles({ limit })
  }

  async readFile(fileId: string): Promise<PixelFileRecord | null> {
    const record = await window.wanwu.pixelArt.readFile({ fileId })
    if (!record) return null
    return {
      meta: record.meta,
      content: deserializePixelDocumentFromIpc(record.content)
    }
  }

  writeFile(
    fileId: string,
    content: PixelDocument,
    baseUpdatedAt: string,
    force?: boolean,
    patch?: PixelWritePatch
  ): Promise<WriteResult> {
    const dto = serializePixelDocumentForIpc(content)
    return window.wanwu.pixelArt.writeFile({ fileId, content: dto, baseUpdatedAt, force, patch })
  }

  async createFile(
    folderId: string,
    title: string,
    width?: number,
    height?: number,
    content?: PixelDocument
  ): Promise<PixelFileRecord> {
    const record = await window.wanwu.pixelArt.createFile({
      folderId,
      title,
      width,
      height,
      content: content ? serializePixelDocumentForIpc(content) : undefined
    })
    return {
      meta: record.meta,
      content: deserializePixelDocumentFromIpc(record.content)
    }
  }

  renameFile(fileId: string, title: string) {
    return window.wanwu.pixelArt.renameFile({ fileId, title })
  }

  softDeleteFile(fileId: string) {
    return window.wanwu.pixelArt.softDeleteFile({ fileId })
  }

  restoreFile(fileId: string) {
    return window.wanwu.pixelArt.restoreFile({ fileId })
  }

  purgeFile(fileId: string) {
    return window.wanwu.pixelArt.purgeFile({ fileId })
  }
}

export type { PixelDocumentDto }
