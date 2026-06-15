function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
import type { DiagramContent, DiagramFileMeta, DiagramPage } from '@shared/types/diagrams'
import type { IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import { createBlankDiagramContent } from '@modules/library/diagrams/lib/blankContent'
import {
  hydrateDiagramGraphAssets,
  stripTransientAssetUrls
} from '@modules/library/diagrams/lib/diagramAssetRefs'
import { cloneForIpc } from '@shared/lib/cloneForIpc'
import { resetDiagramGroupFrameDeleteSession } from '@modules/library/diagrams/lib/diagramGroupFrameDeleteConfirm'
import {
  normalizePageName,
  uniquePageName,
  validatePageRename,
  type PageRenameResult
} from '@modules/library/diagrams/lib/diagramPageNames'

export interface DiagramEditorSessionOptions {
  port: IDiagramEditorPort
  repo: IDiagramRepositoryPort
}

export class DiagramEditorSession {
  readonly sessionId = crypto.randomUUID()
  fileId: string | null = null
  fileMeta: DiagramFileMeta | null = null
  content: DiagramContent | null = null
  activePageId: string | null = null
  dirty = false
  readonly dirtyPageIds = new Set<string>()
  metaDirty = false
  readonly deletedPageIds = new Set<string>()
  /** 每次画布/元数据变脏时递增，用于检测保存过程中的并发编辑 */
  private saveGeneration = 0

  constructor(
    private readonly port: IDiagramEditorPort,
    private readonly repo: IDiagramRepositoryPort
  ) {}

  get pages(): DiagramPage[] {
    return this.content?.pages ?? []
  }

  async openFromTemplate(
    templateContent: DiagramContent,
    options?: { skipViewport?: boolean }
  ): Promise<void> {
    resetDiagramGroupFrameDeleteSession()
    this.fileId = null
    this.fileMeta = null
    this.content = cloneForIpc(templateContent)
    this.activePageId = this.content.meta.defaultPageId
    this.clearDirtyState()
    this.dirty = true
    this.loadActivePageToPort(options)
  }

  async openFromFile(
    fileId: string,
    options?: { skipViewport?: boolean; force?: boolean }
  ): Promise<void> {
    // 会话已持有同一文件时跳过 loadGraph，避免 HMR/重复 bootstrap 整图重绘
    if (!options?.force && this.fileId === fileId && this.content) {
      return
    }
    resetDiagramGroupFrameDeleteSession()
    const record = await this.repo.readFile(fileId)
    if (!record) throw new Error('文件不存在')
    this.fileId = fileId
    this.fileMeta = record.meta
    this.content = record.content
    this.activePageId = record.content.meta.defaultPageId
    this.clearDirtyState()
    this.loadActivePageToPort(options)
  }

  openBlank(title = '未命名流程图'): void {
    resetDiagramGroupFrameDeleteSession()
    this.fileId = null
    this.fileMeta = null
    this.content = createBlankDiagramContent(title)
    this.activePageId = this.content.meta.defaultPageId
    this.clearDirtyState()
    this.loadActivePageToPort()
  }

  private clearDirtyState(): void {
    this.dirtyPageIds.clear()
    this.deletedPageIds.clear()
    this.metaDirty = false
    this.dirty = false
  }

  markActivePageDirty(): void {
    if (!this.activePageId) return
    this.saveGeneration += 1
    this.dirty = true
    this.dirtyPageIds.add(this.activePageId)
  }

  getSaveGeneration(): number {
    return this.saveGeneration
  }

  /** 仅同步视口到内存页数据，不触发 dirty / 自动保存 */
  syncActivePageViewport(): void {
    if (!this.content || !this.activePageId) return
    const page = this.content.pages.find((p) => p.id === this.activePageId)
    if (!page) return
    page.viewport = this.port.getViewport()
  }

  flushActivePage(options?: { markDirty?: boolean }): void {
    if (!this.content || !this.activePageId) return
    const page = this.content.pages.find((p) => p.id === this.activePageId)
    if (!page) return
    page.graphData = stripTransientAssetUrls(
      this.port.getGraph() as DiagramPage['graphData']
    )
    page.viewport = this.port.getViewport()
    page.canvasSettings = this.port.getCanvasSettings()
    if (options?.markDirty !== false) {
      this.markActivePageDirty()
    }
  }

  loadActivePageToPort(options?: { skipViewport?: boolean }): void {
    const page = this.getActivePage()
    if (!page) return
    this.port.loadCanvasSettings(page.canvasSettings)
    this.port.loadGraph(hydrateDiagramGraphAssets(page.graphData, this.fileId))
    if (options?.skipViewport) return
    requestAnimationFrame(() => {
      this.port.resize()
      this.port.applyViewport(page.viewport)
    })
  }

  getActivePage(): DiagramPage | null {
    if (!this.content || !this.activePageId) return null
    return this.content.pages.find((p) => p.id === this.activePageId) ?? null
  }

  switchPage(pageId: string): boolean {
    if (!this.content) return false
    const target = this.content.pages.find((p) => p.id === pageId)
    if (!target) return false
    if (this.activePageId === pageId) return true
    this.flushActivePage()
    this.activePageId = pageId
    this.content.meta.defaultPageId = pageId
    this.metaDirty = true
    this.loadActivePageToPort()
    return true
  }

  addPage(name?: string): DiagramPage {
    if (!this.content) throw new Error('无文档')
    this.flushActivePage()
    const id = newId('page')
    const sortOrder = this.content.pages.length
    const pageName = name
      ? uniquePageName(this.content.pages, name)
      : uniquePageName(this.content.pages, `页${sortOrder + 1}`)
    const page: DiagramPage = {
      id,
      name: pageName,
      sortOrder,
      viewport: { x: 0, y: 0, zoom: 1 },
      graphData: { nodes: [], edges: [] }
    }
    this.content.pages.push(page)
    this.activePageId = id
    this.content.meta.defaultPageId = id
    this.dirty = true
    this.metaDirty = true
    this.dirtyPageIds.add(id)
    this.loadActivePageToPort()
    return page
  }

  renamePage(pageId: string, name: string): PageRenameResult {
    if (!this.content) return 'not_found'
    const verdict = validatePageRename(this.content.pages, pageId, name)
    if (verdict !== 'ok') return verdict
    const page = this.content.pages.find((p) => p.id === pageId)
    if (!page) return 'not_found'
    const normalized = normalizePageName(name)
    if (normalizePageName(page.name) === normalized) return 'ok'
    page.name = normalized
    this.dirty = true
    this.dirtyPageIds.add(pageId)
    this.metaDirty = true
    return 'ok'
  }

  deletePage(pageId: string): boolean {
    if (!this.content || this.content.pages.length <= 1) return false
    const idx = this.content.pages.findIndex((p) => p.id === pageId)
    if (idx < 0) return false
    this.content.pages.splice(idx, 1)
    this.deletedPageIds.add(pageId)
    this.dirtyPageIds.delete(pageId)
    this.metaDirty = true
    if (this.activePageId === pageId) {
      this.activePageId = this.content.pages[0]?.id ?? null
      if (this.activePageId) this.content.meta.defaultPageId = this.activePageId
      this.loadActivePageToPort()
    }
    this.dirty = true
    return true
  }

  duplicatePage(pageId: string): DiagramPage | null {
    if (!this.content) return null
    const source = this.content.pages.find((p) => p.id === pageId)
    if (!source) return null
    this.flushActivePage()
    const id = newId('page')
    const page: DiagramPage = {
      ...cloneForIpc(source),
      id,
      name: uniquePageName(this.content.pages, `${source.name} 副本`),
      sortOrder: this.content.pages.length
    }
    this.content.pages.push(page)
    this.activePageId = id
    this.content.meta.defaultPageId = id
    this.dirty = true
    this.metaDirty = true
    this.dirtyPageIds.add(id)
    this.loadActivePageToPort()
    return page
  }

  private sortedPages(): DiagramPage[] {
    return [...(this.content?.pages ?? [])].sort((a, b) => a.sortOrder - b.sortOrder)
  }

  prevPage(): boolean {
    if (!this.content || !this.activePageId) return false
    const pages = this.sortedPages()
    const idx = pages.findIndex((p) => p.id === this.activePageId)
    if (idx <= 0) return false
    return this.switchPage(pages[idx - 1].id)
  }

  nextPage(): boolean {
    if (!this.content || !this.activePageId) return false
    const pages = this.sortedPages()
    const idx = pages.findIndex((p) => p.id === this.activePageId)
    if (idx < 0 || idx >= pages.length - 1) return false
    return this.switchPage(pages[idx + 1].id)
  }

  reorderPage(pageId: string, sortOrder: number): boolean {
    if (!this.content) return false
    const page = this.content.pages.find((p) => p.id === pageId)
    if (!page) return false
    page.sortOrder = sortOrder
    this.content.pages.sort((a, b) => a.sortOrder - b.sortOrder)
    this.dirty = true
    this.metaDirty = true
    for (const p of this.content.pages) this.dirtyPageIds.add(p.id)
    return true
  }

  get repository(): IDiagramRepositoryPort {
    return this.repo
  }

  get editorPort(): IDiagramEditorPort {
    return this.port
  }

  /** 保存成功后更新元数据；仅清除本次落盘涵盖的 dirty 标记，保留保存期间新增编辑 */
  markSaved(
    meta: DiagramFileMeta,
    options?: {
      persistedPatch?: {
        dirtyPageIds: string[]
        metaDirty: boolean
        deletedPageIds: string[]
      }
      saveGenerationAtStart?: number
    }
  ): void {
    this.fileId = meta.id
    this.fileMeta = meta
    this.flushActivePage({ markDirty: false })

    const concurrentEdit =
      options?.saveGenerationAtStart != null &&
      this.saveGeneration !== options.saveGenerationAtStart

    if (concurrentEdit) {
      this.dirty =
        this.dirtyPageIds.size > 0 || this.metaDirty || this.deletedPageIds.size > 0
      return
    }

    const patch = options?.persistedPatch
    if (patch) {
      for (const id of patch.dirtyPageIds) this.dirtyPageIds.delete(id)
      for (const id of patch.deletedPageIds) this.deletedPageIds.delete(id)
      if (patch.metaDirty) this.metaDirty = false
      this.dirty =
        this.dirtyPageIds.size > 0 || this.metaDirty || this.deletedPageIds.size > 0
      return
    }

    this.clearDirtyState()
  }

  getWritePatch() {
    return {
      dirtyPageIds: [...this.dirtyPageIds],
      metaDirty: this.metaDirty,
      deletedPageIds: [...this.deletedPageIds]
    }
  }
}
