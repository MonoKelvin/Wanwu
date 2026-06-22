import type { PixelDocument, PixelFileMeta, PixelWritePatch, WriteResult } from '@modules/library/pixel-art/domain/types'
import type { IPixelEditorPort } from '@modules/library/pixel-art/services/IPixelEditorPort'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'
import { createBlankPixelDocument, clonePixelDocument } from '@modules/library/pixel-art/lib/blankDocument'
import { PA_FILES } from '@modules/library/pixel-art/domain/meta'
import { PIXEL_AUTOSAVE_DEBOUNCE_MS } from '@modules/library/pixel-art/domain/meta'

export class PixelEditorSession {
  readonly sessionId = crypto.randomUUID()
  fileId: string | null = null
  fileMeta: PixelFileMeta | null = null
  content: PixelDocument | null = null
  dirty = false
  readonly dirtyLayerIds = new Set<string>()
  metaDirty = false
  targetFolderId = PA_FILES

  constructor(
    readonly port: IPixelEditorPort,
    private readonly repo: PixelRepositoryIpcAdapter
  ) {}

  openBlank(width: number, height: number, title = '未命名像素画'): void {
    this.fileId = null
    this.fileMeta = null
    this.content = createBlankPixelDocument(width, height, title)
    this.clearDirty()
    this.dirty = true
    this.port.loadDocument(this.content)
  }

  async openFromFile(fileId: string): Promise<void> {
    const record = await this.repo.readFile(fileId)
    if (!record) throw new Error('文件不存在')
    this.fileId = fileId
    this.fileMeta = record.meta
    this.content = record.content
    this.clearDirty()
    this.port.loadDocument(this.content)
  }

  markLayerDirty(layerId: string): void {
    this.dirtyLayerIds.add(layerId)
    this.dirty = true
  }

  markMetaDirty(): void {
    this.metaDirty = true
    this.dirty = true
  }

  syncFromPort(changedLayerId?: string): void {
    if (!this.content) return
    this.content = this.port.getDocument()
    this.dirty = true
    this.metaDirty = true
    if (changedLayerId) this.dirtyLayerIds.add(changedLayerId)
  }

  clearDirty(): void {
    this.dirty = false
    this.dirtyLayerIds.clear()
    this.metaDirty = false
  }

  buildPatch(): PixelWritePatch | undefined {
    if (!this.dirtyLayerIds.size && !this.metaDirty) return undefined
    return {
      dirtyLayerIds: [...this.dirtyLayerIds],
      meta: this.metaDirty && this.content ? { ...this.content.meta } : undefined
    }
  }

  async save(force = false): Promise<{ ok: boolean; message?: string; reason?: WriteResult['reason'] }> {
    if (!this.content) return { ok: false, message: '无内容' }
    this.syncFromPort()
    if (!this.fileId) {
      return { ok: false, message: 'needs_save_as' }
    }
    const baseUpdatedAt = this.fileMeta?.updatedAt ?? ''
    const patch = this.buildPatch()
    const result = await this.repo.writeFile(this.fileId, this.content, baseUpdatedAt, force, patch)
    if (result.ok && result.updatedAt) {
      this.fileMeta = { ...this.fileMeta!, updatedAt: result.updatedAt }
      this.clearDirty()
    }
    return result
  }

  async saveAs(folderId: string, title: string): Promise<void> {
    this.syncFromPort()
    if (!this.content) throw new Error('无内容')
    const record = await this.repo.createFile(folderId, title, this.content.meta.width, this.content.meta.height, this.content)
    this.fileId = record.meta.id
    this.fileMeta = record.meta
    this.clearDirty()
  }
}

export { PIXEL_AUTOSAVE_DEBOUNCE_MS }
