import { DiagramAppCommandBase } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { DG_FILES } from '@modules/library/diagrams/domain/diagramFolderIds'
import { diagramTitleBase } from '@modules/library/diagrams/lib/diagramHomeUtils'
import { getDiagramTemplate } from '@modules/library/diagrams/lib/diagramTemplates'
import { cloneForIpc } from '@shared/lib/cloneForIpc'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type {
  DiagramFileCloseParams,
  DiagramFileExportParams,
  DiagramFileImportParams,
  DiagramFileOpenParams,
  DiagramFileSaveAsParams,
  DiagramFileSaveParams,
  DiagramProjectOpenRecentFileParams
} from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import { withDiagramSaveMutex } from '@modules/library/diagrams/lib/diagramSaveMutex'
import type { WriteResult } from '@modules/library/diagrams/domain/types'

class FileOpenCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.Open
  readonly title = '打开文件'

  async execute(params: DiagramFileOpenParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = ctx.session
    if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
    const p = this.castParams<DiagramFileOpenParams>(params)
    const skipViewport = Boolean(p.skipViewport)
    if (p.fileId) {
      await session.openFromFile(p.fileId, { skipViewport })
      return { ok: true as const, data: { fileId: session.fileId } }
    }
    if (p.templateId) {
      const tpl = getDiagramTemplate(p.templateId)
      if (!tpl) return diagramError('NOT_FOUND', '模板不存在')
      await session.openFromTemplate(tpl.content, { skipViewport })
      return { ok: true as const, data: { templateId: p.templateId } }
    }
    session.openBlank()
    return { ok: true as const }
  }
}

class FileSaveCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.Save
  readonly title = '保存文件'

  async execute(params: DiagramFileSaveParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramFileSaveParams>(params)
    return saveFile(ctx.session, p.folderId || DG_FILES, p.title, p.force, p.auto)
  }
}

class FileSaveAsCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.SaveAs
  readonly title = '另存为'

  async execute(params: DiagramFileSaveAsParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramFileSaveAsParams>(params)
    return saveAsNew(ctx.session, p.folderId ?? DG_FILES, p.title)
  }
}

class FileReloadCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.Reload
  readonly title = '重新加载'

  async execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    const session = ctx.session
    if (!session?.fileId) return diagramError('VALIDATION', '当前文档尚未保存')
    await session.openFromFile(session.fileId, { force: true })
    return { ok: true as const, data: { fileId: session.fileId } }
  }
}

class FileExportCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.Export
  readonly title = '导出'

  async execute(params: DiagramFileExportParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = ctx.session
    if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
    const p = this.castParams<DiagramFileExportParams>(params)
    const format = p.format ?? 'png'
    const scope = p.scope ?? 'page'

    if (format === 'wfg') {
      session.flushActivePage({ markDirty: false })
      if (!session.content) return diagramError('VALIDATION', '无文档内容')
      const exported = await session.repository.exportWfg({
        fileId: session.fileId,
        content: session.fileId ? undefined : session.content,
        defaultName: session.content.meta.title
      })
      if (!exported.ok) {
        if (exported.canceled) return { ok: true as const, data: { format: 'wfg', canceled: true } }
        return diagramError('INTERNAL', exported.error ?? '导出失败')
      }
      return { ok: true as const, data: { format: 'wfg', path: exported.path } }
    }

    if (scope === 'all') {
      session.flushActivePage({ markDirty: false })
      const restorePageId = session.activePageId
      const pages: Array<{ pageId: string; pageName: string; blob?: Blob; svg?: string }> = []
      for (const page of session.pages) {
        if (page.id !== session.activePageId) session.switchPage(page.id)
        if (format === 'svg') {
          pages.push({ pageId: page.id, pageName: page.name, svg: await session.editorPort.exportSvg() })
        } else {
          pages.push({ pageId: page.id, pageName: page.name, blob: await session.editorPort.exportPng() })
        }
      }
      if (restorePageId && restorePageId !== session.activePageId) session.switchPage(restorePageId)
      return { ok: true as const, data: { format, scope: 'all', pages } }
    }

    if (p.pageId && p.pageId !== session.activePageId) {
      session.switchPage(p.pageId)
    } else {
      session.flushActivePage({ markDirty: false })
    }
    if (format === 'svg') {
      return { ok: true as const, data: { format, svg: await session.editorPort.exportSvg() } }
    }
    return { ok: true as const, data: { format, blob: await session.editorPort.exportPng() } }
  }
}

class FileImportWfgCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.ImportWfg
  readonly title = '导入流程图'

  async execute(params: DiagramFileImportParams | undefined, ctx: DiagramCommandExecutionContext) {
    return importExternal(ctx.session, this.castParams<DiagramFileImportParams>(params), 'wfg')
  }
}

class FileImportDrawioCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.ImportDrawio
  readonly title = '导入 draw.io'

  async execute(params: DiagramFileImportParams | undefined, ctx: DiagramCommandExecutionContext) {
    return importExternal(ctx.session, this.castParams<DiagramFileImportParams>(params), 'drawio')
  }
}

class FileCloseCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.File.Close
  readonly title = '关闭文件'

  async execute(params: DiagramFileCloseParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = ctx.session
    if (!session) return { ok: true as const }
    const p = this.castParams<DiagramFileCloseParams>(params)
    if (!p.discard && session.dirty) return diagramError('VALIDATION', '文档有未保存更改')
    return { ok: true as const }
  }
}

class ProjectOpenRecentFileCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Project.OpenRecentFile
  readonly title = '打开最近文件'

  async execute(params: DiagramProjectOpenRecentFileParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = ctx.session
    if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
    const p = this.castParams<DiagramProjectOpenRecentFileParams>(params)
    await session.openFromFile(p.fileId, { skipViewport: Boolean(p.skipViewport) })
    return { ok: true as const, data: { fileId: session.fileId } }
  }
}

async function importExternal(
  session: DiagramEditorSession | null,
  params: DiagramFileImportParams,
  kind: 'wfg' | 'drawio'
): Promise<DiagramCommandResult> {
  if (!session) return diagramError('NO_SESSION', '无活跃编辑器会话')
  if (session.dirty && !params.discard) return diagramError('VALIDATION', '当前文档有未保存更改')

  const folderId = params.folderId || DG_FILES
  if (kind === 'wfg') {
    const imported = await session.repository.importWfg()
    if (!imported.ok) {
      if (imported.canceled) return { ok: true as const, data: { canceled: true } }
      return diagramError('INTERNAL', imported.error ?? '导入失败')
    }
    const record = await session.repository.importWfgFromSource(
      folderId,
      imported.sourcePath,
      imported.content
    )
    if (!record) return diagramError('INTERNAL', '导入保存失败')
    await session.openFromFile(record.meta.id, { skipViewport: true })
    return { ok: true as const, data: { fileId: record.meta.id, title: record.meta.title } }
  }

  const imported = await session.repository.importDrawio()
  if (!imported.ok) {
    if (imported.canceled) return { ok: true as const, data: { canceled: true } }
    return diagramError('INTERNAL', imported.error ?? '导入失败')
  }
  const record = await session.repository.createFile(
    folderId,
    imported.content.meta.title,
    imported.content
  )
  await session.openFromFile(record.meta.id, { skipViewport: true })
  return { ok: true as const, data: { fileId: record.meta.id, title: record.meta.title } }
}

function mapWriteFailure(result: Extract<WriteResult, { ok: false }>): DiagramCommandResult {
  switch (result.reason) {
    case 'conflict':
      return diagramError('CONFLICT', result.message ?? '保存冲突')
    case 'not_found':
      return diagramError('NOT_FOUND', result.message ?? '文件不存在')
    default:
      return diagramError('INTERNAL', result.message ?? '保存失败')
  }
}

async function saveFile(
  session: DiagramEditorSession | null,
  folderId: string,
  title?: string,
  force?: boolean,
  auto?: boolean
): Promise<DiagramCommandResult> {
  return withDiagramSaveMutex(() =>
    saveFileInner(session, folderId, title, force, auto)
  )
}

async function saveFileInner(
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
    return { ok: true as const, data: { noop: true, fileId: session.fileId } }
  }

  if (!session.fileId) {
    if (auto) {
      return { ok: true as const, data: { noop: true, fileId: null, reason: 'no_file_id' } }
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
    return { ok: true as const, data: saved.record }
  }

  const persistedPatch = session.getWritePatch()
  const saveGenerationAtStart = session.getSaveGeneration()

  const result = await session.repository.writeFile(
    session.fileId,
    content,
    session.fileMeta?.updatedAt ?? '',
    force,
    persistedPatch
  )
  if (!result.ok) return mapWriteFailure(result)

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
  if (meta) session.markSaved(meta, { persistedPatch, saveGenerationAtStart })
  return { ok: true as const, data: { fileId: session.fileId, updatedAt: meta?.updatedAt ?? result.updatedAt, meta } }
}

async function saveAsNew(
  session: DiagramEditorSession | null,
  folderId: string,
  title?: string
): Promise<DiagramCommandResult> {
  if (!session || !session.content) return diagramError('NO_SESSION', '无活跃编辑器会话')
  session.flushActivePage()
  const content = cloneForIpc(session.content)
  if (title) content.meta.title = title
  const record = await session.repository.createFile(folderId || DG_FILES, content.meta.title, content)
  session.markSaved(record.meta)
  return { ok: true as const, data: record }
}

export function registerFileEditorCommands(registry: DiagramCommandRegistry): void {
  registry
    .registerSingleton(new FileOpenCommand())
    .registerSingleton(new FileSaveCommand())
    .registerSingleton(new FileSaveAsCommand())
    .registerSingleton(new FileReloadCommand())
    .registerSingleton(new FileExportCommand())
    .registerSingleton(new FileImportWfgCommand())
    .registerSingleton(new FileImportDrawioCommand())
    .registerSingleton(new FileCloseCommand())
    .registerSingleton(new ProjectOpenRecentFileCommand())
}
