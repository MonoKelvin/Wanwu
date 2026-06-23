import type { TransactionManager } from '@app/transaction'
import { PixelCmd } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { pixelCmdFail, pixelCmdOk } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import { PIXEL_PALETTE_PRESETS } from '@modules/library/pixel-art/domain/meta'
import type { IPixelEditorPort } from '@modules/library/pixel-art/services/IPixelEditorPort'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'
import type { ToolId, ToolOptions } from '@modules/library/pixel-art/domain/tools'
import type { PixelDocumentDto } from '@modules/library/pixel-art/lib/pixelIpcCodec'
import { deserializePixelDocumentFromIpc } from '@modules/library/pixel-art/lib/pixelIpcCodec'
import {
  recordDocumentMutation,
  recordPixelStroke
} from '@modules/library/pixel-art/app/createPixelTransactionManager'
import { getActiveFrame } from '@modules/library/pixel-art/lib/blankDocument'
import { getGridCellSize } from '@modules/library/pixel-art/lib/pixelGridCell'
import {
  captureDocumentSnapshot,
  getPixelLayerClipboard,
  setPixelLayerClipboard
} from '@modules/library/pixel-art/lib/pixelUndoSnapshot'

export interface EditorCommandDeps {
  getPort: () => IPixelEditorPort | null
  getSession: () => PixelEditorSession | null
  getTransactionManager?: () => TransactionManager | null
  onChange?: () => void
}

export interface FileCommandDeps {
  getSession: () => PixelEditorSession | null
  onSave?: () => void | Promise<void>
  onSaveAs?: () => void | Promise<void>
  onExport?: (payload: Record<string, unknown>) => void | Promise<void>
  onNew?: () => void | Promise<void>
  onOpenRecent?: () => void | Promise<void>
}

async function recordPortDocumentChange(
  deps: EditorCommandDeps,
  label: string,
  before: ReturnType<typeof captureDocumentSnapshot>
): Promise<void> {
  const port = deps.getPort()
  if (!port) return
  const after = captureDocumentSnapshot(port)
  await recordDocumentMutation(deps.getTransactionManager?.(), label, before, after)
}

export function registerCanvasCommands(registry: PixelCommandRegistry, deps: EditorCommandDeps): void {
  const port = () => deps.getPort()
  const session = () => deps.getSession()
  const tx = () => deps.getTransactionManager?.() ?? null

  registry.register(PixelCmd.Document.Undo, async () => {
    const manager = tx()
    if (manager?.canUndo()) {
      const result = await manager.undo()
      if (!result.ok) return pixelCmdFail('INTERNAL', result.message ?? '撤销失败')
      session()?.syncFromPort()
      deps.onChange?.()
      return pixelCmdOk()
    }
    port()?.undo()
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.Redo, async () => {
    const manager = tx()
    if (manager?.canRedo()) {
      const result = await manager.redo()
      if (!result.ok) return pixelCmdFail('INTERNAL', result.message ?? '重做失败')
      session()?.syncFromPort()
      deps.onChange?.()
      return pixelCmdOk()
    }
    port()?.redo()
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetForeground, async (cmd) => {
    const color = String(cmd.payload?.color ?? '')
    const p = port()
    if (!color || !p) return pixelCmdFail('INVALID', '缺少 color')
    const before = captureDocumentSnapshot(p)
    p.setForeground(color)
    await recordPortDocumentChange(deps, '设置前景色', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetBackground, async (cmd) => {
    const color = String(cmd.payload?.color ?? '')
    const p = port()
    if (!color || !p) return pixelCmdFail('INVALID', '缺少 color')
    const before = captureDocumentSnapshot(p)
    p.setBackgroundColor(color)
    await recordPortDocumentChange(deps, '设置背景色', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetGrid, async (cmd) => {
    const p = port()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const before = captureDocumentSnapshot(p)
    p.setGridVisible(Boolean(cmd.payload?.visible))
    await recordPortDocumentChange(deps, '切换网格', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetCheckerboard, async (cmd) => {
    const p = port()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const before = captureDocumentSnapshot(p)
    p.setCheckerboardVisible(Boolean(cmd.payload?.visible))
    await recordPortDocumentChange(deps, '切换棋盘格', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetBrushPreview, async (cmd) => {
    const p = port()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const before = captureDocumentSnapshot(p)
    p.setBrushPreviewVisible(Boolean(cmd.payload?.visible))
    await recordPortDocumentChange(deps, '切换笔刷预览', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetCanvasBackground, async (cmd) => {
    const s = session()
    const p = port()
    const background = cmd.payload?.background
    if (!s?.content || !p || typeof background !== 'string') return pixelCmdFail('INVALID', '参数无效')
    const value = background === 'transparent' ? 'transparent' : background
    const before = captureDocumentSnapshot(p)
    p.setCanvasBackground(value)
    await recordPortDocumentChange(deps, '设置画布底色', before)
    s.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetPixelUnitSize, async (cmd) => {
    const size = Number(cmd.payload?.pixelUnitSize)
    const p = port()
    if (!Number.isFinite(size) || !p) return pixelCmdFail('INVALID', '参数无效')
    const before = captureDocumentSnapshot(p)
    p.setPixelUnitSize(size)
    await recordPortDocumentChange(deps, '调整像素单位', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetGridSubdiv, async (cmd) => {
    const size = Number(cmd.payload?.size)
    const p = port()
    if (!Number.isFinite(size) || !p) return pixelCmdFail('INVALID', '参数无效')
    const before = captureDocumentSnapshot(p)
    p.setGridSubdiv(size)
    await recordPortDocumentChange(deps, '调整网格细分', before)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.ResizeCanvas, async (cmd) => {
    const p = port()
    const s = session()
    const width = Number(cmd.payload?.width)
    const height = Number(cmd.payload?.height)
    const anchor = (cmd.payload?.anchor as 'top-left' | 'center' | undefined) ?? 'center'
    if (!p || !s?.content || !Number.isFinite(width) || !Number.isFinite(height)) {
      return pixelCmdFail('INVALID', '参数无效')
    }
    const before = captureDocumentSnapshot(p)
    const ok = p.resizeDocument(width, height, anchor)
    if (!ok) return pixelCmdFail('INVALID', '尺寸无效')
    await recordPortDocumentChange(deps, '调整画布尺寸', before)
    s.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.ApplyPalettePreset, async (cmd) => {
    const preset = cmd.payload?.preset
    const s = session()
    const p = port()
    if (!s?.content || !p || (preset !== 'default' && preset !== 'retro')) {
      return pixelCmdFail('INVALID', '参数无效')
    }
    const before = captureDocumentSnapshot(p)
    const palette = [...PIXEL_PALETTE_PRESETS[preset]]
    s.content.meta.palette = palette
    const after = p.getDocument()
    after.meta.palette = palette
    p.loadDocument(after)
    await recordDocumentMutation(deps.getTransactionManager?.(), '应用调色板预设', before, after)
    s.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetZoom, (cmd) => {
    const p = port()
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
    } else if (action === 'reset') {
      p.zoomReset()
    } else if (typeof cmd.payload?.zoom === 'number') {
      p.setViewport({ zoom: cmd.payload.zoom as number })
    }
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetPan, (cmd) => {
    port()?.setViewport({
      panX: cmd.payload?.panX as number | undefined,
      panY: cmd.payload?.panY as number | undefined
    })
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SelectAll, () => {
    port()?.selectAll()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.MoveSelection, (cmd) => {
    const rawDx = Number(cmd.payload?.dx ?? 0)
    const rawDy = Number(cmd.payload?.dy ?? 0)
    const meta = session()?.content?.meta
    const step = meta ? getGridCellSize(meta) : 1
    const dx = rawDx * step
    const dy = rawDy * step
    const moved = port()?.moveSelection(dx, dy)
    if (!moved) return pixelCmdFail('NO_SELECTION', '无选区或无法移动')
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.ClearSelection, (cmd) => {
    const p = port()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const mode = String(cmd.payload?.mode ?? 'content')
    if (mode === 'deselect') {
      p.clearSelection()
      return pixelCmdOk()
    }
    const cleared = p.clearSelectionContent()
    if (!cleared) return pixelCmdFail('NO_SELECTION', '无选区或无法清除')
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.DrawStroke, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const before = cmd.payload?.before as Uint8ClampedArray | undefined
    const after = cmd.payload?.after as Uint8ClampedArray | undefined
    const label = String(cmd.payload?.label ?? '笔划')
    if (!layerId || !before || !after) return pixelCmdFail('INVALID', '参数无效')
    const manager = tx()
    if (manager) {
      await recordPixelStroke(manager, layerId, before, after, label)
    } else {
      port()?.replaceLayerPixels(layerId, after)
    }
    session()?.syncFromPort(layerId)
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.Fill, (cmd) => {
    const x = Number(cmd.payload?.x)
    const y = Number(cmd.payload?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return pixelCmdFail('INVALID', '坐标无效')
    const ok = port()?.fillAt(x, y)
    if (!ok) return pixelCmdFail('NO_CHANGE', '无填充变化')
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.PickColor, (cmd) => {
    const x = Number(cmd.payload?.x)
    const y = Number(cmd.payload?.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return pixelCmdFail('INVALID', '坐标无效')
    const ok = port()?.pickColorAtPixel(x, y)
    if (!ok) return pixelCmdFail('INVALID', '无法取色')
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.GradientFill, (cmd) => {
    const x0 = Number(cmd.payload?.x0)
    const y0 = Number(cmd.payload?.y0)
    const x1 = Number(cmd.payload?.x1)
    const y1 = Number(cmd.payload?.y1)
    if (![x0, y0, x1, y1].every(Number.isFinite)) return pixelCmdFail('INVALID', '坐标无效')
    const ok = port()?.applyGradientAt(x0, y0, x1, y1)
    if (!ok) return pixelCmdFail('NO_CHANGE', '渐变未应用')
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.DrawShape, (cmd) => {
    const tool = cmd.payload?.tool as 'line' | 'rect' | 'ellipse' | undefined
    const x0 = Number(cmd.payload?.x0)
    const y0 = Number(cmd.payload?.y0)
    const x1 = Number(cmd.payload?.x1)
    const y1 = Number(cmd.payload?.y1)
    if (!tool || ![x0, y0, x1, y1].every(Number.isFinite)) return pixelCmdFail('INVALID', '参数无效')
    const ok = port()?.drawShapeAt(tool, x0, y0, x1, y1)
    if (!ok) return pixelCmdFail('NO_CHANGE', '图形未绘制')
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })
}

export function registerToolSelectCommand(
  registry: PixelCommandRegistry,
  deps: EditorCommandDeps & {
    setActiveTool?: (tool: ToolId) => void
    getActiveTool?: () => ToolId
  }
): void {
  registry.register(PixelCmd.Tool.Select, (cmd) => {
    const tool = cmd.payload?.tool as ToolId | undefined
    if (!tool) return pixelCmdFail('INVALID', '缺少 tool')
    deps.getPort()?.setTool(tool)
    deps.setActiveTool?.(tool)
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Tool.HoldPan, (cmd) => {
    const p = deps.getPort()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    if (Boolean(cmd.payload?.active)) {
      p.setTool('hand')
    } else {
      p.setTool(deps.getActiveTool?.() ?? p.getTool().id)
    }
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Tool.SetOptions, (cmd) => {
    const p = deps.getPort()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const patch = cmd.payload as Partial<ToolOptions> | undefined
    if (!patch || !Object.keys(patch).length) return pixelCmdFail('INVALID', '缺少 options')
    p.setTool(p.getTool().id, patch)
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Tool.BrushSize, (cmd) => {
    const delta = Number(cmd.payload?.delta ?? 0)
    const p = deps.getPort()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const current = p.getTool().options.brushSize
    const next = Math.max(1, Math.min(8, current + delta))
    p.setTool(p.getTool().id, { brushSize: next })
    deps.onChange?.()
    return pixelCmdOk({ brushSize: next })
  })

  registry.register(PixelCmd.Tool.SwapColors, async () => {
    const s = deps.getSession()
    const p = deps.getPort()
    if (!s?.content || !p) return pixelCmdFail('NO_DOC', '无文档')
    const before = captureDocumentSnapshot(p)
    const fg = s.content.meta.foreground
    s.content.meta.foreground = s.content.meta.backgroundColor
    s.content.meta.backgroundColor = fg
    p.setForeground(s.content.meta.foreground)
    p.setBackgroundColor(s.content.meta.backgroundColor)
    await recordPortDocumentChange(deps, '交换前景/背景色', before)
    s.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })
}

export function registerLayerCommands(registry: PixelCommandRegistry, deps: EditorCommandDeps): void {
  const port = () => deps.getPort()

  registry.register(PixelCmd.Layer.Add, async (cmd) => {
    const p = port()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const before = captureDocumentSnapshot(p)
    const id = p.addLayer(cmd.payload?.name as string | undefined)
    if (!id) return pixelCmdFail('ADD_FAILED', '无法添加图层')
    await recordPortDocumentChange(deps, '添加图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk({ layerId: id })
  })

  registry.register(PixelCmd.Layer.Delete, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const p = port()
    if (!layerId || !p) return pixelCmdFail('INVALID', '缺少 layerId')
    const before = captureDocumentSnapshot(p)
    p.deleteLayer(layerId)
    await recordPortDocumentChange(deps, '删除图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetActive, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    if (!layerId) return pixelCmdFail('INVALID', '缺少 layerId')
    port()?.setActiveLayer(layerId)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetVisible, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const visible = cmd.payload?.visible as boolean | undefined
    const p = port()
    if (!layerId || visible === undefined || !p) return pixelCmdFail('INVALID', '参数无效')
    const before = captureDocumentSnapshot(p)
    p.setLayerVisible(layerId, visible)
    await recordPortDocumentChange(deps, visible ? '显示图层' : '隐藏图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetLocked, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const locked = cmd.payload?.locked as boolean | undefined
    const p = port()
    if (!layerId || locked === undefined || !p) return pixelCmdFail('INVALID', '参数无效')
    const before = captureDocumentSnapshot(p)
    p.setLayerLocked(layerId, locked)
    await recordPortDocumentChange(deps, locked ? '锁定图层' : '解锁图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Rename, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const name = String(cmd.payload?.name ?? '')
    const p = port()
    if (!layerId || !name || !p) return pixelCmdFail('INVALID', '参数无效')
    const before = captureDocumentSnapshot(p)
    p.renameLayer(layerId, name)
    await recordPortDocumentChange(deps, '重命名图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Reorder, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const newIndex = Number(cmd.payload?.newIndex ?? -1)
    const p = port()
    if (!layerId || newIndex < 0 || !p) return pixelCmdFail('INVALID', '参数无效')
    const before = captureDocumentSnapshot(p)
    p.reorderLayer(layerId, newIndex)
    await recordPortDocumentChange(deps, '调整图层顺序', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.MergeVisible, async () => {
    const p = port()
    if (!p) return pixelCmdFail('NO_PORT', '画布未就绪')
    const before = captureDocumentSnapshot(p)
    if (!p.mergeVisibleLayers()) return pixelCmdFail('MERGE_FAILED', '无可合并的可见层')
    await recordPortDocumentChange(deps, '合并可见图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Duplicate, async (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const p = port()
    if (!layerId || !p) return pixelCmdFail('INVALID', '缺少 layerId')
    const before = captureDocumentSnapshot(p)
    const id = p.duplicateLayer(layerId)
    if (!id) return pixelCmdFail('DUPLICATE_FAILED', '无法复制图层')
    await recordPortDocumentChange(deps, '复制图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk({ layerId: id })
  })

  registry.register(PixelCmd.Layer.Merge, async (cmd) => {
    const layerIds = cmd.payload?.layerIds as string[] | undefined
    const p = port()
    if (!p || !Array.isArray(layerIds) || layerIds.length < 2) {
      return pixelCmdFail('INVALID', '至少选择两个图层')
    }
    const before = captureDocumentSnapshot(p)
    if (!p.mergeLayers(layerIds)) return pixelCmdFail('MERGE_FAILED', '无法合并图层')
    await recordPortDocumentChange(deps, '合并图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Copy, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    if (!layerId || !port()) return pixelCmdFail('INVALID', '缺少 layerId')
    const doc = port()!.getDocument()
    const layer = getActiveFrame(doc).layers.find((l) => l.id === layerId)
    const pixels = doc.layerPixels[layerId]
    if (!layer || !pixels) return pixelCmdFail('NOT_FOUND', '图层不存在')
    const { id: _id, ...meta } = layer
    setPixelLayerClipboard({
      meta,
      pixels: new Uint8ClampedArray(pixels),
      width: doc.meta.width,
      height: doc.meta.height
    })
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Paste, async () => {
    const clip = getPixelLayerClipboard()
    const p = port()
    if (!clip || !p) return pixelCmdFail('EMPTY', '剪贴板为空')
    const before = captureDocumentSnapshot(p)
    const id = p.pasteLayer(clip)
    if (!id) return pixelCmdFail('PASTE_FAILED', '无法粘贴图层')
    await recordPortDocumentChange(deps, '粘贴图层', before)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk({ layerId: id })
  })
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

  registry.register(PixelCmd.File.New, async (cmd) => {
    if (deps.onNew) await deps.onNew()
    else {
      const w = Number(cmd.payload?.width ?? 32)
      const h = Number(cmd.payload?.height ?? 32)
      deps.getSession()?.openBlank(w, h)
    }
    return pixelCmdOk()
  })

  registry.register(PixelCmd.File.OpenRecent, async () => {
    if (deps.onOpenRecent) await deps.onOpenRecent()
    return pixelCmdOk()
  })
}

export function registerCatalogCommands(
  registry: PixelCommandRegistry,
  deps: { repo: PixelRepositoryIpcAdapter }
): void {
  registry.register(PixelCmd.Catalog.File.Create, async (cmd) => {
    const folderId = String(cmd.payload?.folderId ?? '')
    const title = String(cmd.payload?.title ?? '')
    const width = cmd.payload?.width != null ? Number(cmd.payload.width) : undefined
    const height = cmd.payload?.height != null ? Number(cmd.payload.height) : undefined
    const contentDto = cmd.payload?.content as PixelDocumentDto | undefined
    const contentPath = cmd.payload?.contentPath != null ? String(cmd.payload.contentPath) : undefined
    if (!folderId || !title) return pixelCmdFail('INVALID', '参数无效')
    const content = contentDto ? deserializePixelDocumentFromIpc(contentDto) : undefined
    const record = await deps.repo.createFile(folderId, title, width, height, content, contentPath)
    return pixelCmdOk({ meta: record.meta, record })
  })

  registry.register(PixelCmd.Catalog.File.ImportFromImage, async (cmd) => {
    const folderId = String(cmd.payload?.folderId ?? '')
    const title = String(cmd.payload?.title ?? '')
    const contentDto = cmd.payload?.content as PixelDocumentDto | undefined
    if (!folderId || !title || !contentDto) return pixelCmdFail('INVALID', '参数无效')
    const content = deserializePixelDocumentFromIpc(contentDto)
    const record = await deps.repo.createFile(
      folderId,
      title,
      content.meta.width,
      content.meta.height,
      content
    )
    return pixelCmdOk({ meta: record.meta, record })
  })

  registry.register(PixelCmd.Catalog.File.Rename, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    const title = String(cmd.payload?.title ?? '')
    if (!fileId || !title) return pixelCmdFail('INVALID', '参数无效')
    const meta = await deps.repo.renameFile(fileId, title)
    return meta ? pixelCmdOk({ meta }) : pixelCmdFail('NOT_FOUND', '文件不存在')
  })

  registry.register(PixelCmd.Catalog.File.SoftDelete, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    if (!fileId) return pixelCmdFail('INVALID', '缺少 fileId')
    const ok = await deps.repo.softDeleteFile(fileId)
    return ok ? pixelCmdOk() : pixelCmdFail('NOT_FOUND', '文件不存在')
  })

  registry.register(PixelCmd.Catalog.File.Restore, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    if (!fileId) return pixelCmdFail('INVALID', '缺少 fileId')
    const meta = await deps.repo.restoreFile(fileId)
    return meta ? pixelCmdOk({ meta }) : pixelCmdFail('NOT_FOUND', '文件不存在')
  })

  registry.register(PixelCmd.Catalog.File.Purge, async (cmd) => {
    const fileId = String(cmd.payload?.fileId ?? '')
    if (!fileId) return pixelCmdFail('INVALID', '缺少 fileId')
    const ok = await deps.repo.purgeFile(fileId)
    return ok ? pixelCmdOk() : pixelCmdFail('NOT_FOUND', '文件不存在')
  })
}
