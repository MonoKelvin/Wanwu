import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import { DG_DRAFTS, DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'
import { getDiagramTemplate } from '@modules/library/diagrams/lib/diagramTemplates'

export class DocumentCommandHandler implements IDiagramCommandHandler {
  readonly domain = 'document' as const

  constructor(private readonly getSession: () => DiagramEditorSession | null) {}

  canHandle(type: string): boolean {
    return type.startsWith('document.')
  }

  async execute(cmd: DiagramCommandEnvelope, _ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const session = this.getSession()
    const p = cmd.payload ?? {}

    try {
      switch (cmd.type) {
        case 'document.open': {
          if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
          if (p.fileId) {
            await session.openFromFile(p.fileId as string)
            return { ok: true, data: { fileId: session.fileId } }
          }
          if (p.templateId) {
            const tpl = getDiagramTemplate(p.templateId as string)
            if (!tpl) return diagramError('NOT_FOUND', '模板不存在')
            await session.openFromTemplate(tpl.content)
            return { ok: true, data: { templateId: p.templateId } }
          }
          session.openBlank()
          return { ok: true }
        }
        case 'document.save':
          return this.save(
            session,
            (p.folderId as string) || DG_DRAFTS,
            p.title as string | undefined
          )
        case 'document.saveAs':
          return this.save(session, (p.folderId as string) ?? DG_FILES, p.title as string | undefined)
        case 'document.export': {
          if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
          const format = (p.format as 'png' | 'svg') ?? 'png'
          if (p.pageId && p.pageId !== session.activePageId) {
            session.switchPage(p.pageId as string)
          } else {
            session.flushActivePage()
          }
          if (format === 'svg') {
            const svg = await session.editorPort.exportSvg()
            return { ok: true, data: { format, svg } }
          }
          const blob = await session.editorPort.exportPng()
          return { ok: true, data: { format, blob } }
        }
        case 'document.close': {
          if (!session) return { ok: true }
          if (!p.discard && session.dirty) {
            return diagramError('VALIDATION', '文档有未保存更改')
          }
          return { ok: true }
        }
        default:
          return diagramError('UNKNOWN_COMMAND', `未支持的文档命令: ${cmd.type}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return diagramError('INTERNAL', message)
    }
  }

  private async save(
    session: DiagramEditorSession | null,
    folderId: string,
    title?: string
  ): Promise<DiagramCommandResult> {
    if (!session || !session.content) return diagramError('NO_SESSION', '无活跃编辑器会话')
    session.flushActivePage()

    const content = session.content
    if (title) content.meta.title = title

    if (!session.fileId) {
      const record = await session.repository.createFile(
        folderId || DG_DRAFTS,
        content.meta.title,
        content
      )
      session.markSaved(record.meta)
      return { ok: true, data: record }
    }

    const result = await session.repository.writeFile(
      session.fileId,
      content,
      session.fileMeta?.updatedAt ?? ''
    )
    if (!result.ok) {
      return diagramError('CONFLICT', result.message ?? '保存冲突')
    }
    if (session.fileMeta) {
      session.fileMeta = {
        ...session.fileMeta,
        title: content.meta.title,
        pageCount: content.pages.length,
        updatedAt: result.updatedAt
      }
    }
    session.dirty = false
    return { ok: true, data: { fileId: session.fileId, updatedAt: result.updatedAt } }
  }
}
