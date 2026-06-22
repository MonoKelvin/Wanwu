import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'
import type { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { pixelCmdOk } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'

export interface FileCommandDeps {
  getSession: () => PixelEditorSession | null
  onSave?: () => void | Promise<void>
  onSaveAs?: () => void | Promise<void>
  onExport?: (payload: Record<string, unknown>) => void | Promise<void>
  onNew?: () => void | Promise<void>
  onOpenRecent?: () => void | Promise<void>
}

export function registerFileCommands(registry: PixelCommandRegistry, deps: FileCommandDeps): void {
  registry.register(PixelCmd.File.Save, async () => {
    if (deps.onSave) await deps.onSave()
    else await deps.getSession()?.save()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.File.SaveAs, async (cmd) => {
    if (deps.onSaveAs) {
      deps.onSaveAs()
    } else {
      const folderId = String(cmd.payload?.folderId ?? 'pa-files')
      const title = String(cmd.payload?.title ?? deps.getSession()?.content?.meta.title ?? '未命名像素画')
      await deps.getSession()?.saveAs(folderId, title)
    }
    return pixelCmdOk()
  })

  registry.register(PixelCmd.File.Export, async (cmd) => {
    if (deps.onExport) await deps.onExport(cmd.payload ?? {})
    return pixelCmdOk()
  })

  registry.register(PixelCmd.File.Close, () => pixelCmdOk())

  registry.register('Pixel.File.New', async (cmd) => {
    if (deps.onNew) await deps.onNew()
    else {
      const w = Number(cmd.payload?.width ?? 32)
      const h = Number(cmd.payload?.height ?? 32)
      deps.getSession()?.openBlank(w, h)
    }
    return pixelCmdOk()
  })

  registry.register('Pixel.File.OpenRecent', async () => {
    if (deps.onOpenRecent) await deps.onOpenRecent()
    return pixelCmdOk()
  })
}
