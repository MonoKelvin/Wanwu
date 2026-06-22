import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'
import type { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { pixelCmdFail, pixelCmdOk } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'

export interface CatalogCommandDeps {
  repo: PixelRepositoryIpcAdapter
}

export function registerCatalogCommands(registry: PixelCommandRegistry, deps: CatalogCommandDeps): void {
  registry.register(PixelCmd.Catalog.File.Rename, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    const title = String(cmd.payload?.title ?? '')
    if (!fileId || !title) return pixelCmdFail('INVALID', '参数无效')
    const meta = await deps.repo.renameFile(fileId, title)
    return meta ? pixelCmdOk({ meta }) : pixelCmdFail('NOT_FOUND', '文件不存在')
  })

  registry.register(PixelCmd.Catalog.File.Move, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    const folderId = String(cmd.payload?.folderId ?? '')
    if (!fileId || !folderId) return pixelCmdFail('INVALID', '参数无效')
    const meta = await deps.repo.moveFile(fileId, folderId)
    return meta ? pixelCmdOk({ meta }) : pixelCmdFail('NOT_FOUND', '文件不存在')
  })

  registry.register(PixelCmd.Catalog.File.SoftDelete, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    if (!fileId) return pixelCmdFail('INVALID', '缺少 fileId')
    const ok = await deps.repo.softDeleteFile(fileId)
    return ok ? pixelCmdOk() : pixelCmdFail('NOT_FOUND', '文件不存在')
  })

  registry.register(PixelCmd.Catalog.Folder.Create, async (cmd) => {
    const name = String(cmd.payload?.name ?? '')
    if (!name) return pixelCmdFail('INVALID', '缺少 name')
    const folder = await deps.repo.createFolder(name)
    return pixelCmdOk({ folder })
  })
}
