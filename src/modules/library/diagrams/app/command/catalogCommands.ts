import { DiagramAppCommandBase } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import { DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'
import type {
  DiagramCatalogFileCreateParams,
  DiagramCatalogFileDuplicateParams,
  DiagramCatalogFileListParams,
  DiagramCatalogFileMoveParams,
  DiagramCatalogFilePurgeParams,
  DiagramCatalogFileReadParams,
  DiagramCatalogFileRenameParams,
  DiagramCatalogFileRestoreParams,
  DiagramCatalogFileSetPinnedParams,
  DiagramCatalogFileSoftDeleteParams,
  DiagramCatalogFolderCreateParams,
  DiagramCatalogFolderDeleteParams,
  DiagramCatalogFolderRenameParams,
  DiagramCatalogFolderReorderParams
} from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramContent } from '@shared/types/diagrams'

class CatalogFileListCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.List
  readonly title = '列出文件'

  async execute(params: DiagramCatalogFileListParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileListParams>(params)
    return { ok: true as const, data: await ctx.repo.listFiles(p.folderId) }
  }
}

class CatalogFileCreateCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Create
  readonly title = '创建文件'

  async execute(params: DiagramCatalogFileCreateParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileCreateParams>(params)
    return {
      ok: true as const,
      data: await ctx.repo.createFile(p.folderId, p.title, p.content as DiagramContent | undefined)
    }
  }
}

class CatalogFileReadCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Read
  readonly title = '读取文件'

  async execute(params: DiagramCatalogFileReadParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileReadParams>(params)
    const record = await ctx.repo.readFile(p.fileId)
    if (!record) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const, data: record }
  }
}

class CatalogFileRenameCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Rename
  readonly title = '重命名文件'

  async execute(params: DiagramCatalogFileRenameParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileRenameParams>(params)
    const meta = await ctx.repo.renameFile(p.fileId, p.title)
    if (!meta) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const, data: meta }
  }
}

class CatalogFileMoveCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Move
  readonly title = '移动文件'

  async execute(params: DiagramCatalogFileMoveParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileMoveParams>(params)
    if (p.folderId === DG_HOME || p.folderId === DG_RECYCLE) {
      return diagramError('VALIDATION', '不能移动到该分组')
    }
    const meta = await ctx.repo.moveFile(p.fileId, p.folderId)
    if (!meta) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const, data: meta }
  }
}

class CatalogFileDuplicateCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Duplicate
  readonly title = '复制文件'

  async execute(params: DiagramCatalogFileDuplicateParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileDuplicateParams>(params)
    const record = await ctx.repo.duplicateFile(p.fileId)
    if (!record) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const, data: record }
  }
}

class CatalogFileSetPinnedCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.SetPinned
  readonly title = '置顶文件'

  async execute(params: DiagramCatalogFileSetPinnedParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileSetPinnedParams>(params)
    const meta = await ctx.repo.setFilePinned(p.fileId, Boolean(p.pinned))
    if (!meta) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const, data: meta }
  }
}

class CatalogFileSoftDeleteCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.SoftDelete
  readonly title = '删除文件'

  async execute(params: DiagramCatalogFileSoftDeleteParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileSoftDeleteParams>(params)
    const deleted = await ctx.repo.softDeleteFile(p.fileId)
    if (!deleted) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const }
  }
}

class CatalogFileRestoreCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Restore
  readonly title = '恢复文件'

  async execute(params: DiagramCatalogFileRestoreParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFileRestoreParams>(params)
    const meta = await ctx.repo.restoreFile(p.fileId)
    if (!meta) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const, data: meta }
  }
}

class CatalogFilePurgeCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.File.Purge
  readonly title = '彻底删除文件'

  async execute(params: DiagramCatalogFilePurgeParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFilePurgeParams>(params)
    const purged = await ctx.repo.purgeFile(p.fileId)
    if (!purged) return diagramError('NOT_FOUND', '文件不存在')
    return { ok: true as const }
  }
}

class CatalogFolderListCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.Folder.List
  readonly title = '列出分组'

  async execute(_params: undefined, ctx: DiagramCommandExecutionContext) {
    return { ok: true as const, data: await ctx.repo.listFolders() }
  }
}

class CatalogFolderCreateCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.Folder.Create
  readonly title = '创建分组'

  async execute(params: DiagramCatalogFolderCreateParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFolderCreateParams>(params)
    return { ok: true as const, data: await ctx.repo.createFolder(p.name) }
  }
}

class CatalogFolderRenameCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.Folder.Rename
  readonly title = '重命名分组'

  async execute(params: DiagramCatalogFolderRenameParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFolderRenameParams>(params)
    await ctx.repo.renameFolder(p.folderId, p.name)
    return { ok: true as const }
  }
}

class CatalogFolderDeleteCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.Folder.Delete
  readonly title = '删除分组'

  async execute(params: DiagramCatalogFolderDeleteParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFolderDeleteParams>(params)
    await ctx.repo.deleteFolder(p.folderId)
    return { ok: true as const }
  }
}

class CatalogFolderReorderCommand extends DiagramAppCommandBase {
  readonly id = DiagramCmd.Catalog.Folder.Reorder
  readonly title = '排序分组'

  async execute(params: DiagramCatalogFolderReorderParams | undefined, ctx: DiagramCommandExecutionContext) {
    const p = this.castParams<DiagramCatalogFolderReorderParams>(params)
    await ctx.repo.reorderFolders(p.orders)
    return { ok: true as const }
  }
}

export function registerCatalogCommands(registry: DiagramCommandRegistry): void {
  registry
    .registerSingleton(new CatalogFileListCommand())
    .registerSingleton(new CatalogFileCreateCommand())
    .registerSingleton(new CatalogFileReadCommand())
    .registerSingleton(new CatalogFileRenameCommand())
    .registerSingleton(new CatalogFileMoveCommand())
    .registerSingleton(new CatalogFileDuplicateCommand())
    .registerSingleton(new CatalogFileSetPinnedCommand())
    .registerSingleton(new CatalogFileSoftDeleteCommand())
    .registerSingleton(new CatalogFileRestoreCommand())
    .registerSingleton(new CatalogFilePurgeCommand())
    .registerSingleton(new CatalogFolderListCommand())
    .registerSingleton(new CatalogFolderCreateCommand())
    .registerSingleton(new CatalogFolderRenameCommand())
    .registerSingleton(new CatalogFolderDeleteCommand())
    .registerSingleton(new CatalogFolderReorderCommand())
}
