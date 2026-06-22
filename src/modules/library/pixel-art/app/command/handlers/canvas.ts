import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'
import type { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { pixelCmdFail, pixelCmdOk } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import type { IPixelEditorPort } from '@modules/library/pixel-art/interfaces/IPixelEditorPort'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'

export interface CanvasCommandDeps {
  getPort: () => IPixelEditorPort | null
  getSession: () => PixelEditorSession | null
  onChange?: () => void
}

export function registerCanvasCommands(registry: PixelCommandRegistry, deps: CanvasCommandDeps): void {
  const port = () => deps.getPort()
  const session = () => deps.getSession()

  registry.register(PixelCmd.Document.Undo, () => {
    port()?.undo()
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.Redo, () => {
    port()?.redo()
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetForeground, (cmd) => {
    const color = String(cmd.payload?.color ?? '')
    if (!color) return pixelCmdFail('INVALID', '缺少 color')
    port()?.setForeground(color)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetBackground, (cmd) => {
    const color = String(cmd.payload?.color ?? '')
    if (!color) return pixelCmdFail('INVALID', '缺少 color')
    port()?.setBackgroundColor(color)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetGrid, (cmd) => {
    port()?.setGridVisible(Boolean(cmd.payload?.visible))
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetCheckerboard, (cmd) => {
    port()?.setCheckerboardVisible(Boolean(cmd.payload?.visible))
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetZoom, (cmd) => {
    const p = port() as import('@modules/library/pixel-art/services/PixelCanvasEngine').PixelCanvasEngine | null
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const action = cmd.payload?.action as string | undefined
    if (action === 'in') {
      p.zoomIn()
    } else if (action === 'out') {
      p.zoomOut()
    } else if (action === 'fit') {
      const w = Number(cmd.payload?.width ?? 0)
      const h = Number(cmd.payload?.height ?? 0)
      if (w > 0 && h > 0) p.zoomToFit(w, h)
    } else if (typeof cmd.payload?.zoom === 'number') {
      p.setViewport({ zoom: cmd.payload.zoom as number })
    }
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetPan, (cmd) => {
    port()?.setViewport({
      panX: cmd.payload?.panX as number | undefined,
      panY: cmd.payload?.panY as number | undefined
    })
    deps.onChange?.()
    return pixelCmdOk()
  })
}

export function registerToolSelectCommand(
  registry: PixelCommandRegistry,
  deps: CanvasCommandDeps & { setActiveTool?: (tool: ToolId) => void }
): void {
  registry.register('Pixel.Tool.Select', (cmd) => {
    const tool = cmd.payload?.tool as ToolId | undefined
    if (!tool) return pixelCmdFail('INVALID', '缺少 tool')
    deps.getPort()?.setTool(tool)
    deps.setActiveTool?.(tool)
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register('Pixel.Tool.BrushSize', (cmd) => {
    const delta = Number(cmd.payload?.delta ?? 0)
    const p = deps.getPort()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const current = p.getTool().options.brushSize
    const next = Math.max(1, Math.min(8, current + delta))
    p.setTool(p.getTool().id, { brushSize: next })
    deps.onChange?.()
    return pixelCmdOk({ brushSize: next })
  })

  registry.register('Pixel.Tool.SwapColors', () => {
    const s = deps.getSession()
    const p = deps.getPort()
    if (!s?.content || !p) return pixelCmdFail('NO_DOC', '无文档')
    const fg = s.content.meta.foreground
    s.content.meta.foreground = s.content.meta.backgroundColor
    s.content.meta.backgroundColor = fg
    p.setForeground(s.content.meta.foreground)
    p.setBackgroundColor(s.content.meta.backgroundColor)
    deps.onChange?.()
    return pixelCmdOk()
  })
}
