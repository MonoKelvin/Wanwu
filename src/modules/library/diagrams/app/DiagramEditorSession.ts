function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}
import type { DiagramContent, DiagramFileMeta, DiagramPage } from '@shared/types/diagrams'
import type { IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import { createBlankDiagramContent } from '@modules/library/diagrams/lib/blankContent'

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

  constructor(
    private readonly port: IDiagramEditorPort,
    private readonly repo: IDiagramRepositoryPort
  ) {}

  get pages(): DiagramPage[] {
    return this.content?.pages ?? []
  }

  async openFromTemplate(templateContent: DiagramContent): Promise<void> {
    this.fileId = null
    this.fileMeta = null
    this.content = structuredClone(templateContent)
    this.activePageId = this.content.meta.defaultPageId
    this.dirty = true
    this.loadActivePageToPort()
  }

  async openFromFile(fileId: string): Promise<void> {
    const record = await this.repo.readFile(fileId)
    if (!record) throw new Error('文件不存在')
    this.fileId = fileId
    this.fileMeta = record.meta
    this.content = record.content
    this.activePageId = record.content.meta.defaultPageId
    this.dirty = false
    this.loadActivePageToPort()
  }

  openBlank(title = '未命名流程图'): void {
    this.fileId = null
    this.fileMeta = null
    this.content = createBlankDiagramContent(title)
    this.activePageId = this.content.meta.defaultPageId
    this.dirty = true
    this.loadActivePageToPort()
  }

  flushActivePage(): void {
    if (!this.content || !this.activePageId) return
    const page = this.content.pages.find((p) => p.id === this.activePageId)
    if (!page) return
    page.graphData = this.port.getGraph() as DiagramPage['graphData']
    this.dirty = true
  }

  loadActivePageToPort(): void {
    const page = this.getActivePage()
    if (!page) return
    this.port.loadGraph(page.graphData)
  }

  getActivePage(): DiagramPage | null {
    if (!this.content || !this.activePageId) return null
    return this.content.pages.find((p) => p.id === this.activePageId) ?? null
  }

  switchPage(pageId: string): boolean {
    if (!this.content) return false
    const target = this.content.pages.find((p) => p.id === pageId)
    if (!target) return false
    this.flushActivePage()
    this.activePageId = pageId
    this.content.meta.defaultPageId = pageId
    this.loadActivePageToPort()
    return true
  }

  addPage(name?: string): DiagramPage {
    if (!this.content) throw new Error('无文档')
    this.flushActivePage()
    const id = newId('page')
    const sortOrder = this.content.pages.length
    const page: DiagramPage = {
      id,
      name: name ?? `页${sortOrder + 1}`,
      sortOrder,
      viewport: { x: 0, y: 0, zoom: 1 },
      graphData: { nodes: [], edges: [] }
    }
    this.content.pages.push(page)
    this.activePageId = id
    this.content.meta.defaultPageId = id
    this.dirty = true
    this.loadActivePageToPort()
    return page
  }

  renamePage(pageId: string, name: string): boolean {
    if (!this.content) return false
    const page = this.content.pages.find((p) => p.id === pageId)
    if (!page) return false
    page.name = name
    this.dirty = true
    return true
  }

  deletePage(pageId: string): boolean {
    if (!this.content || this.content.pages.length <= 1) return false
    const idx = this.content.pages.findIndex((p) => p.id === pageId)
    if (idx < 0) return false
    this.content.pages.splice(idx, 1)
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
      ...structuredClone(source),
      id,
      name: `${source.name} 副本`,
      sortOrder: this.content.pages.length
    }
    this.content.pages.push(page)
    this.dirty = true
    return page
  }

  reorderPage(pageId: string, sortOrder: number): boolean {
    if (!this.content) return false
    const page = this.content.pages.find((p) => p.id === pageId)
    if (!page) return false
    page.sortOrder = sortOrder
    this.content.pages.sort((a, b) => a.sortOrder - b.sortOrder)
    this.dirty = true
    return true
  }

  get repository(): IDiagramRepositoryPort {
    return this.repo
  }

  get editorPort(): IDiagramEditorPort {
    return this.port
  }

  markSaved(meta: DiagramFileMeta): void {
    this.fileId = meta.id
    this.fileMeta = meta
    this.dirty = false
  }
}
