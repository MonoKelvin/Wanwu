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
import { recordPixelStroke } from '@modules/library/pixel-art/app/createPixelTransactionManager'
import { getActiveFrame } from '@modules/library/pixel-art/lib/blankDocument'
import {
  getPixelLayerClipboard,
  setPixelLayerClipboard
} from '@modules/library/pixel-art/lib/pixelLayerClipboard'

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

  registry.register(PixelCmd.Document.SetCanvasBackground, (cmd) => {
    const s = session()
    const p = port()
    const background = cmd.payload?.background
    if (!s?.content || !p || typeof background !== 'string') return pixelCmdFail('INVALID', '参数无效')
    s.content.meta.background = background === 'transparent' ? 'transparent' : background
    p.render()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetPixelUnitSize, (cmd) => {
    const size = Number(cmd.payload?.pixelUnitSize)
    if (!Number.isFinite(size)) return pixelCmdFail('INVALID', '参数无效')
    port()?.setPixelUnitSize(size)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.SetGridSubdiv, (cmd) => {
    const size = Number(cmd.payload?.size)
    if (!Number.isFinite(size)) return pixelCmdFail('INVALID', '参数无效')
    port()?.setGridSubdiv(size)
    session()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.ResizeCanvas, (cmd) => {
    const p = port()
    const s = session()
    const width = Number(cmd.payload?.width)
    const height = Number(cmd.payload?.height)
    const anchor = (cmd.payload?.anchor as 'top-left' | 'center' | undefined) ?? 'center'
    if (!p || !s?.content || !Number.isFinite(width) || !Number.isFinite(height)) {
      return pixelCmdFail('INVALID', '参数无效')
    }
    const ok = p.resizeDocument(width, height, anchor)
    if (!ok) return pixelCmdFail('INVALID', '尺寸无效')
    s.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.ApplyPalettePreset, (cmd) => {
    const preset = cmd.payload?.preset
    const s = session()
    if (!s?.content || (preset !== 'default' && preset !== 'retro')) {
      return pixelCmdFail('INVALID', '参数无效')
    }
    s.content.meta.palette = [...PIXEL_PALETTE_PRESETS[preset]]
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
    const dx = Number(cmd.payload?.dx ?? 0)
    const dy = Number(cmd.payload?.dy ?? 0)
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
    if (!layerId || !before || !after) return pixelCmdFail('INVALID', '参数无效')
    const manager = tx()
    if (manager) {
      await recordPixelStroke(manager, layerId, before, after)
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
    port()?.fillAt(x, y)
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
    port()?.applyGradientAt(x0, y0, x1, y1)
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Document.DrawShape, (cmd) => {
    const tool = cmd.payload?.tool as 'line' | 'rect' | 'ellipse' | undefined
    const x0 = Number(cmd.payload?.x0)
    const y0 = Number(cmd.payload?.y0)
    const x1 = Number(cmd.payload?.x1)
    const y1 = Number(cmd.payload?.y1)
    if (!tool || ![x0, y0, x1, y1].every(Number.isFinite)) return pixelCmdFail('INVALID', '参数无效')
    port()?.drawShapeAt(tool, x0, y0, x1, y1)
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

  registry.register(PixelCmd.Tool.SwapColors, () => {
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

export function registerLayerCommands(registry: PixelCommandRegistry, deps: EditorCommandDeps): void {
  const port = () => deps.getPort()

  registry.register(PixelCmd.Layer.Add, (cmd) => {
    const id = port()?.addLayer(cmd.payload?.name as string | undefined)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk({ layerId: id })
  })

  registry.register(PixelCmd.Layer.Delete, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    if (!layerId) return pixelCmdFail('INVALID', '缺少 layerId')
    port()?.deleteLayer(layerId)
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

  registry.register(PixelCmd.Layer.SetVisible, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const visible = cmd.payload?.visible as boolean | undefined
    if (!layerId || visible === undefined) return pixelCmdFail('INVALID', '参数无效')
    port()?.setLayerVisible(layerId, visible)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.SetLocked, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const locked = cmd.payload?.locked as boolean | undefined
    if (!layerId || locked === undefined) return pixelCmdFail('INVALID', '参数无效')
    port()?.setLayerLocked(layerId, locked)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Rename, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const name = String(cmd.payload?.name ?? '')
    if (!layerId || !name) return pixelCmdFail('INVALID', '参数无效')
    port()?.renameLayer(layerId, name)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Reorder, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    const newIndex = Number(cmd.payload?.newIndex ?? -1)
    if (!layerId || newIndex < 0) return pixelCmdFail('INVALID', '参数无效')
    port()?.reorderLayer(layerId, newIndex)
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.MergeVisible, () => {
    if (!port()?.mergeVisibleLayers()) return pixelCmdFail('MERGE_FAILED', '无可合并的可见层')
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk()
  })

  registry.register(PixelCmd.Layer.Duplicate, (cmd) => {
    const layerId = String(cmd.payload?.layerId ?? '')
    if (!layerId) return pixelCmdFail('INVALID', '缺少 layerId')
    const id = port()?.duplicateLayer(layerId)
    if (!id) return pixelCmdFail('DUPLICATE_FAILED', '无法复制图层')
    deps.getSession()?.syncFromPort()
    deps.onChange?.()
    return pixelCmdOk({ layerId: id })
  })

  registry.register(PixelCmd.Layer.Merge, (cmd) => {
    const layerIds = cmd.payload?.layerIds as string[] | undefined
    if (!Array.isArray(layerIds) || layerIds.length < 2) return pixelCmdFail('INVALID', '至少选择两个图层')
    if (!port()?.mergeLayers(layerIds)) return pixelCmdFail('MERGE_FAILED', '无法合并图层')
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

  registry.register(PixelCmd.Layer.Paste, () => {
    const clip = getPixelLayerClipboard()
    if (!clip) return pixelCmdFail('EMPTY', '剪贴板为空')
    const id = port()?.pasteLayer(clip)
    if (!id) return pixelCmdFail('PASTE_FAILED', '无法粘贴图层')
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
