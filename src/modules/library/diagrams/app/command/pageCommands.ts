import { DiagramAppCommandBase } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type {
  DiagramPageAddParams,
  DiagramPageDeleteParams,
  DiagramPageDuplicateParams,
  DiagramPageRenameParams,
  DiagramPageReorderParams,
  DiagramPageSwitchParams
} from '@modules/library/diagrams/app/command/domain/payloads'

function requireSession(
  ctx: DiagramCommandExecutionContext
): DiagramEditorSession | DiagramCommandResult {
  if (!ctx.session) return diagramError('NO_SESSION', '无活跃编辑器会话')
  return ctx.session
}

abstract class PageCommandBase extends DiagramAppCommandBase {
  protected getSession(ctx: DiagramCommandExecutionContext): DiagramEditorSession | DiagramCommandResult {
    return requireSession(ctx)
  }
}

class PageAddCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Add
  readonly title = '添加页面'

  execute(params: DiagramPageAddParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    const page = session.addPage(this.castParams<DiagramPageAddParams>(params).name)
    return Promise.resolve({ ok: true as const, data: { pageId: page.id, name: page.name } })
  }
}

class PageRenameCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Rename
  readonly title = '重命名页面'

  execute(params: DiagramPageRenameParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    const p = this.castParams<DiagramPageRenameParams>(params)
    const verdict = session.renamePage(p.pageId, p.name)
    if (verdict === 'not_found') return Promise.resolve(diagramError('NOT_FOUND', '页面不存在'))
    if (verdict === 'empty') return Promise.resolve(diagramError('VALIDATION', '页面名称不能为空'))
    if (verdict === 'duplicate') return Promise.resolve(diagramError('VALIDATION', '页面名称已存在'))
    return Promise.resolve({ ok: true as const })
  }
}

class PageDeleteCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Delete
  readonly title = '删除页面'

  execute(params: DiagramPageDeleteParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    const p = this.castParams<DiagramPageDeleteParams>(params)
    if (!session.deletePage(p.pageId)) {
      return Promise.resolve(diagramError('VALIDATION', '无法删除页面'))
    }
    return Promise.resolve({ ok: true as const })
  }
}

class PageDuplicateCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Duplicate
  readonly title = '复制页面'

  execute(params: DiagramPageDuplicateParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    const page = session.duplicatePage(this.castParams<DiagramPageDuplicateParams>(params).pageId)
    if (!page) return Promise.resolve(diagramError('NOT_FOUND', '页面不存在'))
    return Promise.resolve({ ok: true as const, data: { pageId: page.id } })
  }
}

class PageReorderCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Reorder
  readonly title = '排序页面'

  execute(params: DiagramPageReorderParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    const p = this.castParams<DiagramPageReorderParams>(params)
    if (!session.reorderPage(p.pageId, p.sortOrder)) {
      return Promise.resolve(diagramError('NOT_FOUND', '页面不存在'))
    }
    return Promise.resolve({ ok: true as const })
  }
}

class PageSwitchCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Switch
  readonly title = '切换页面'

  execute(params: DiagramPageSwitchParams | undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    const p = this.castParams<DiagramPageSwitchParams>(params)
    if (!session.switchPage(p.pageId)) {
      return Promise.resolve(diagramError('NOT_FOUND', '页面不存在'))
    }
    return Promise.resolve({ ok: true as const, data: { pageId: p.pageId } })
  }
}

class PagePrevCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Prev
  readonly title = '上一页'

  execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    if (!session.prevPage()) return Promise.resolve(diagramError('VALIDATION', '已是第一页'))
    return Promise.resolve({ ok: true as const, data: { pageId: session.activePageId } })
  }
}

class PageNextCommand extends PageCommandBase {
  readonly id = DiagramCmd.Page.Next
  readonly title = '下一页'

  execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    const session = this.getSession(ctx)
    if (!('pages' in session)) return Promise.resolve(session)
    if (!session.nextPage()) return Promise.resolve(diagramError('VALIDATION', '已是最后一页'))
    return Promise.resolve({ ok: true as const, data: { pageId: session.activePageId } })
  }
}

export function registerPageCommands(registry: DiagramCommandRegistry): void {
  registry
    .registerSingleton(new PageAddCommand())
    .registerSingleton(new PageRenameCommand())
    .registerSingleton(new PageDeleteCommand())
    .registerSingleton(new PageDuplicateCommand())
    .registerSingleton(new PageReorderCommand())
    .registerSingleton(new PageSwitchCommand())
    .registerSingleton(new PagePrevCommand())
    .registerSingleton(new PageNextCommand())
}
