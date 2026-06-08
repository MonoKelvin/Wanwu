import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'
import { diagramTitleBase } from '@modules/library/diagrams/lib/diagramHomeUtils'
import { getDiagramTemplate } from '@modules/library/diagrams/lib/diagramTemplates'
import { cloneForIpc } from '@shared/lib/cloneForIpc'

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
          const skipViewport = Boolean(p.skipViewport)
          if (p.fileId) {
            await session.openFromFile(p.fileId as string, { skipViewport })
            return { ok: true, data: { fileId: session.fileId } }
          }
          if (p.templateId) {
            const tpl = getDiagramTemplate(p.templateId as string)
            if (!tpl) return diagramError('NOT_FOUND', '模板不存在')
            await session.openFromTemplate(tpl.content, { skipViewport })
            return { ok: true, data: { templateId: p.templateId } }
          }
          session.openBlank()
          return { ok: true }
        }
        case 'document.save':
          return this.save(
            session,
            (p.folderId as string) || DG_FILES,
            p.title as string | undefined,
            p.force as boolean | undefined,
            p.auto as boolean | undefined
          )
        case 'document.saveAs':
          return this.saveAsNew(
            session,
            (p.folderId as string) ?? DG_FILES,
            p.title as string | undefined
          )
        case 'document.importWfg': {
          if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
          if (session.dirty && !p.discard) {
            return diagramError('VALIDATION', '当前文档有未保存更改')
          }
          const imported = await session.repository.importWfg()
          if (!imported.ok) {
            if (imported.canceled) return { ok: true, data: { canceled: true } }
            return diagramError('INTERNAL', imported.error ?? '导入失败')
          }
          const folderId = (p.folderId as string) || DG_FILES
          const record = await session.repository.importWfgFromSource(
            folderId,
            imported.sourcePath,
            imported.content
          )
          if (!record) return diagramError('INTERNAL', '导入保存失败')
          await session.openFromFile(record.meta.id, { skipViewport: true })
          return { ok: true, data: { fileId: record.meta.id, title: record.meta.title } }
        }
        case 'document.importDrawio': {
          if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
          if (session.dirty && !p.discard) {
            return diagramError('VALIDATION', '当前文档有未保存更改')
          }
          const imported = await session.repository.importDrawio()
          if (!imported.ok) {
            if (imported.canceled) return { ok: true, data: { canceled: true } }
            return diagramError('INTERNAL', imported.error ?? '导入失败')
          }
          const folderId = (p.folderId as string) || DG_FILES
          const record = await session.repository.createFile(
            folderId,
            imported.content.meta.title,
            imported.content
          )
          await session.openFromFile(record.meta.id, { skipViewport: true })
          return { ok: true, data: { fileId: record.meta.id, title: record.meta.title } }
        }
        case 'document.reload': {
          if (!session?.fileId) return diagramError('VALIDATION', '当前文档尚未保存')
          await session.openFromFile(session.fileId)
          return { ok: true, data: { fileId: session.fileId } }
        }
        case 'document.export': {
          if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
          const format = (p.format as 'png' | 'svg' | 'wfg') ?? 'png'
          const scope = (p.scope as 'page' | 'all') ?? 'page'

          if (format === 'wfg') {
            session.flushActivePage({ markDirty: false })
            if (!session.content) return diagramError('VALIDATION', '无文档内容')
            const exported = await session.repository.exportWfg({
              fileId: session.fileId,
              content: session.fileId ? undefined : session.content,
              defaultName: session.content.meta.title
            })
            if (!exported.ok) {
              if (exported.canceled) return { ok: true, data: { format: 'wfg', canceled: true } }
              return diagramError('INTERNAL', exported.error ?? '导出失败')
            }
            return { ok: true, data: { format: 'wfg', path: exported.path } }
          }

          if (scope === 'all') {
            session.flushActivePage({ markDirty: false })
            const restorePageId = session.activePageId
            const pages: Array<{ pageId: string; pageName: string; blob?: Blob; svg?: string }> = []
            for (const page of session.pages) {
              if (page.id !== session.activePageId) {
                session.switchPage(page.id)
              }
              if (format === 'svg') {
                pages.push({
                  pageId: page.id,
                  pageName: page.name,
                  svg: await session.editorPort.exportSvg()
                })
              } else {
                pages.push({
                  pageId: page.id,
                  pageName: page.name,
                  blob: await session.editorPort.exportPng()
                })
              }
            }
            if (restorePageId && restorePageId !== session.activePageId) {
              session.switchPage(restorePageId)
            }
            return { ok: true, data: { format, scope: 'all', pages } }
          }

          if (p.pageId && p.pageId !== session.activePageId) {
            session.switchPage(p.pageId as string)
          } else {
            session.flushActivePage({ markDirty: false })
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
    title?: string,
    force?: boolean,
    auto?: boolean
  ): Promise<DiagramCommandResult> {
    if (!session || !session.content) return diagramError('NO_SESSION', '无活跃编辑器会话')
    session.flushActivePage()

    const content = session.content
    const prevTitle = session.fileMeta?.title
    if (title) {
      content.meta.title = title
      session.metaDirty = true
    }

    if (!session.dirty && !title && !force) {
      return { ok: true, data: { noop: true, fileId: session.fileId } }
    }

    if (!session.fileId) {
      if (auto) {
        const record = await session.repository.createFile(
          folderId || DG_FILES,
          content.meta.title,
          content
        )
        session.markSaved(record.meta)
        return { ok: true, data: record }
      }
      const saved = await session.repository.saveNewWithDialog({
        folderId: folderId || DG_FILES,
        content,
        defaultName: content.meta.title
      })
      if (!saved.ok) {
        if (saved.canceled) return diagramError('CANCELED', '已取消保存')
        return diagramError('INTERNAL', saved.error ?? '保存失败')
      }
      session.markSaved(saved.record.meta)
      return { ok: true, data: saved.record }
    }

    const result = await session.repository.writeFile(
      session.fileId,
      content,
      session.fileMeta?.updatedAt ?? '',
      force,
      session.getWritePatch()
    )
    if (!result.ok) {
      return diagramError('CONFLICT', result.message ?? '保存冲突')
    }
    let meta = session.fileMeta
    if (meta) {
      meta = {
        ...meta,
        title: content.meta.title,
        pageCount: content.pages.length,
        updatedAt: result.updatedAt
      }
    }
    const titleChanged =
      Boolean(title) &&
      Boolean(prevTitle) &&
      diagramTitleBase(prevTitle!) !== diagramTitleBase(content.meta.title)
    if (session.fileId && titleChanged) {
      const renamed = await session.repository.renameFile(session.fileId, content.meta.title)
      if (!renamed) return diagramError('INTERNAL', '重命名失败')
      meta = renamed
    }
    if (meta) session.markSaved(meta)
    return { ok: true, data: { fileId: session.fileId, updatedAt: meta?.updatedAt ?? result.updatedAt, meta } }
  }

  private async saveAsNew(
    session: DiagramEditorSession | null,
    folderId: string,
    title?: string
  ): Promise<DiagramCommandResult> {
    if (!session || !session.content) return diagramError('NO_SESSION', '无活跃编辑器会话')
    session.flushActivePage()

    const content = cloneForIpc(session.content)
    if (title) content.meta.title = title

    const record = await session.repository.createFile(
      folderId || DG_FILES,
      content.meta.title,
      content
    )
    session.markSaved(record.meta)
    return { ok: true, data: record }
  }
}
