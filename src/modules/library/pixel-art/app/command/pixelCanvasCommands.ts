import { PixelCmd } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'
import type { ToolOptions } from '@modules/library/pixel-art/domain/tools'

export type PixelCanvasCommands = ReturnType<typeof createPixelCanvasCommands>

/** 画布编辑命令的语义化封装（无 UI 副作用） */
export function createPixelCanvasCommands(bus: IPixelCommandBus) {
  const dispatch = (type: string, payload?: Record<string, unknown>) =>
    void bus.dispatch({ type, payload })

  return {
    undo: () => dispatch(PixelCmd.Document.Undo),
    redo: () => dispatch(PixelCmd.Document.Redo),
    selectTool: (tool: ToolId) => dispatch(PixelCmd.Tool.Select, { tool }),
    setToolOptions: (patch: Partial<ToolOptions>) => dispatch(PixelCmd.Tool.SetOptions, patch),
    swapColors: () => dispatch(PixelCmd.Tool.SwapColors),
    setForeground: (color: string) => dispatch(PixelCmd.Document.SetForeground, { color }),
    setBackground: (color: string) => dispatch(PixelCmd.Document.SetBackground, { color }),
    toggleGrid: (visible: boolean) => dispatch(PixelCmd.Document.SetGrid, { visible }),
    toggleCheckerboard: (visible: boolean) => dispatch(PixelCmd.Document.SetCheckerboard, { visible }),
    setCanvasBackground: (background: string) =>
      dispatch(PixelCmd.Document.SetCanvasBackground, { background }),
    setPixelUnitSize: (pixelUnitSize: number) =>
      dispatch(PixelCmd.Document.SetPixelUnitSize, { pixelUnitSize }),
    setGridSubdiv: (size: number) => dispatch(PixelCmd.Document.SetGridSubdiv, { size }),
    resizeCanvas: (width: number, height: number, anchor: 'top-left' | 'center' = 'center') =>
      dispatch(PixelCmd.Document.ResizeCanvas, { width, height, anchor }),
    applyPalettePreset: (preset: 'default' | 'retro') =>
      dispatch(PixelCmd.Document.ApplyPalettePreset, { preset }),
    selectAll: () => dispatch(PixelCmd.Document.SelectAll),
    clearSelection: () => dispatch(PixelCmd.Document.ClearSelection),
    zoomIn: () => dispatch(PixelCmd.Document.SetZoom, { action: 'in' }),
    zoomOut: () => dispatch(PixelCmd.Document.SetZoom, { action: 'out' }),
    zoomReset: () => dispatch(PixelCmd.Document.SetZoom, { action: 'reset' }),
    zoomToFit: (width: number, height: number) =>
      dispatch(PixelCmd.Document.SetZoom, { action: 'fit', width, height })
  }
}
