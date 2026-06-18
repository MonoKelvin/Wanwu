import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import type { DiagramContent, DiagramWritePatch } from '@modules/library/diagrams/domain/types'
import { cloneForIpc } from '@shared/lib/cloneForIpc'

export class DiagramRepositoryIpcAdapter implements IDiagramRepositoryPort {
  listFolders() {
    return window.wanwu.diagrams.listFolders()
  }

  listFiles(folderId: string) {
    return window.wanwu.diagrams.listFiles({ folderId })
  }

  listRecentFiles(limit = 20) {
    return window.wanwu.diagrams.listRecentFiles({ limit })
  }

  readFile(fileId: string) {
    return window.wanwu.diagrams.readFile({ fileId })
  }

  writeFile(
    fileId: string,
    content: DiagramContent,
    baseUpdatedAt: string,
    force?: boolean,
    patch?: DiagramWritePatch
  ) {
    return window.wanwu.diagrams.writeFile({
      fileId,
      content: cloneForIpc(content),
      baseUpdatedAt,
      force,
      patch
    })
  }

  importWfg() {
    return window.wanwu.diagrams.importWfg()
  }

  importWfgFromSource(folderId: string, sourcePath: string, content: DiagramContent) {
    return window.wanwu.diagrams.importWfgFromSource({
      folderId,
      sourcePath,
      content: cloneForIpc(content)
    })
  }

  importDrawio() {
    return window.wanwu.diagrams.importDrawio()
  }

  exportWfg(input: { fileId?: string | null; content?: DiagramContent; defaultName: string }) {
    return window.wanwu.diagrams.exportWfg({
      ...input,
      content: input.content ? cloneForIpc(input.content) : undefined
    })
  }

  createFile(folderId: string, title: string, content?: DiagramContent) {
    return window.wanwu.diagrams.createFile({
      folderId,
      title,
      content: content ? cloneForIpc(content) : undefined
    })
  }

  saveNewWithDialog(input: {
    folderId: string
    content: DiagramContent
    defaultName: string
  }) {
    return window.wanwu.diagrams.saveNewWithDialog({
      ...input,
      content: cloneForIpc(input.content)
    })
  }

  renameFile(fileId: string, title: string) {
    return window.wanwu.diagrams.renameFile({ fileId, title })
  }

  moveFile(fileId: string, folderId: string) {
    return window.wanwu.diagrams.moveFile({ fileId, folderId })
  }

  duplicateFile(fileId: string) {
    return window.wanwu.diagrams.duplicateFile({ fileId })
  }

  setFilePinned(fileId: string, pinned: boolean) {
    return window.wanwu.diagrams.setFilePinned({ fileId, pinned })
  }

  softDeleteFile(fileId: string) {
    return window.wanwu.diagrams.softDeleteFile({ fileId })
  }

  restoreFile(fileId: string) {
    return window.wanwu.diagrams.restoreFile({ fileId })
  }

  purgeFile(fileId: string) {
    return window.wanwu.diagrams.purgeFile({ fileId })
  }

  createFolder(name: string) {
    return window.wanwu.diagrams.createFolder({ name })
  }

  async renameFolder(folderId: string, name: string) {
    await window.wanwu.diagrams.renameFolder({ folderId, name })
  }

  async deleteFolder(folderId: string) {
    await window.wanwu.diagrams.deleteFolder({ folderId })
  }

  async reorderFolders(orders: Array<{ folderId: string; sortOrder: number }>) {
    await window.wanwu.diagrams.reorderFolders({ orders })
  }
}
