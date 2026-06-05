import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import type { DiagramContent } from '@shared/types/diagrams'

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

  writeFile(fileId: string, content: DiagramContent, baseUpdatedAt: string) {
    return window.wanwu.diagrams.writeFile({ fileId, content, baseUpdatedAt })
  }

  createFile(folderId: string, title: string, content?: DiagramContent) {
    return window.wanwu.diagrams.createFile({ folderId, title, content })
  }

  renameFile(fileId: string, title: string) {
    return window.wanwu.diagrams.renameFile({ fileId, title })
  }

  moveFile(fileId: string, folderId: string) {
    return window.wanwu.diagrams.moveFile({ fileId, folderId })
  }

  async softDeleteFile(fileId: string) {
    await window.wanwu.diagrams.softDeleteFile({ fileId })
  }

  async restoreFile(fileId: string) {
    await window.wanwu.diagrams.restoreFile({ fileId })
  }

  async purgeFile(fileId: string) {
    await window.wanwu.diagrams.purgeFile({ fileId })
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
