import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'
import type { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { pixelCmdFail, pixelCmdOk } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import type { IPixelEditorPort } from '@modules/library/pixel-art/interfaces/IPixelEditorPort'

export interface LayerCommandDeps {
  getPort: () => IPixelEditorPort | null
  getSession: () => PixelEditorSession | null
  onChange?: () => void
}

export function registerLayerCommands(registry: PixelCommandRegistry, deps: LayerCommandDeps): void {
  const engine = () => deps.getPort() as import('@modules/library/pixel-art/services/PixelCanvasEngine').PixelCanvasEngine | null

  registry.register(PixelCmd.Layer.Add, (cmd) => {
    const id = engine()?.addLayer(cmd.payload?.name as string | undefined)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk({ layerId: id })
  })

  registry.register(PixelCmd.Layer.Delete, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    if (!layerId) return pixelCmdFail('INVALID', '缺少 layerId')
    engine()?.deleteLayer(layerId)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetActive, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    if (!layerId) return pixelCmdFail('INVALID', '缺少 layerId')
    deps.getPort()?.setActiveLayer(layerId)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetVisible, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const visible = cmd.payload?.visible as boolean | undefined
    if (!layerId || visible === undefined) return pixelCmdFail('INVALID', '参数无效')
    const engine = deps.getPort() as import('@modules/library/pixel-art/services/PixelCanvasEngine').PixelCanvasEngine | null
    engine?.setLayerVisible(layerId, visible)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetLocked, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const locked = cmd.payload?.locked as boolean | undefined
    if (!layerId || locked === undefined) return pixelCmdFail('INVALID', '参数无效')
    const engine = deps.getPort() as import('@modules/library/pixel-art/services/PixelCanvasEngine').PixelCanvasEngine | null
    engine?.setLayerLocked(layerId, locked)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Rename, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const name = String(cmd.payload?.name ?? '')
    if (!layerId || !name) return pixelCmdFail('INVALID', '参数无效')
    engine()?.renameLayer(layerId, name)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Reorder, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const newIndex = Number(cmd.payload?.newIndex ?? -1)
    if (!layerId || newIndex < 0) return pixelCmdFail('INVALID', '参数无效')
    engine()?.reorderLayer(layerId, newIndex)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.MergeVisible, () => {
    const engine = deps.getPort() as import('@modules/library/pixel-art/services/PixelCanvasEngine').PixelCanvasEngine | null
    if (!engine?.mergeVisibleLayers()) return pixelCmdFail('MERGE_FAILED', '无可合并的可见层')
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })
}
