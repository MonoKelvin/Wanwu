import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'

export class PageCommandHandler implements IDiagramCommandHandler {
  readonly domain = 'page' as const

  constructor(private readonly getSession: () => DiagramEditorSession | null) {}

  canHandle(type: string): boolean {
    return type.startsWith('page.')
  }

  async execute(cmd: DiagramCommandEnvelope, _ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const session = this.getSession()
    if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')

    const p = cmd.payload ?? {}

    try {
      switch (cmd.type) {
        case 'page.add': {
          const page = session.addPage(p.name as string | undefined)
          return { ok: true, data: { pageId: page.id, name: page.name } }
        }
        case 'page.rename':
          if (!session.renamePage(p.pageId as string, p.name as string)) {
            return diagramError('NOT_FOUND', '页面不存在')
          }
          return { ok: true }
        case 'page.delete':
          if (!session.deletePage(p.pageId as string)) {
            return diagramError('VALIDATION', '无法删除页面')
          }
          return { ok: true }
        case 'page.duplicate': {
          const page = session.duplicatePage(p.pageId as string)
          if (!page) return diagramError('NOT_FOUND', '页面不存在')
          return { ok: true, data: { pageId: page.id } }
        }
        case 'page.reorder':
          if (!session.reorderPage(p.pageId as string, p.sortOrder as number)) {
            return diagramError('NOT_FOUND', '页面不存在')
          }
          return { ok: true }
        case 'page.switch':
          if (!session.switchPage(p.pageId as string)) {
            return diagramError('NOT_FOUND', '页面不存在')
          }
          return { ok: true, data: { pageId: p.pageId } }
        case 'page.prev':
          if (!session.prevPage()) return diagramError('VALIDATION', '已是第一页')
          return { ok: true, data: { pageId: session.activePageId } }
        case 'page.next':
          if (!session.nextPage()) return diagramError('VALIDATION', '已是最后一页')
          return { ok: true, data: { pageId: session.activePageId } }
        default:
          return diagramError('UNKNOWN_COMMAND', `未支持的页面命令: ${cmd.type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return diagramError('INTERNAL', message)
    }
  }
}
