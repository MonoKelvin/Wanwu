export const PixelCmd = {
  File: {
    Save: 'Pixel.File.Save',
    SaveAs: 'Pixel.File.SaveAs',
    Export: 'Pixel.File.Export',
    Close: 'Pixel.File.Close',
    New: 'Pixel.File.New',
    OpenRecent: 'Pixel.File.OpenRecent'
  },
  Tool: {
    Select: 'Pixel.Tool.Select',
    HoldPan: 'Pixel.Tool.HoldPan',
    BrushSize: 'Pixel.Tool.BrushSize',
    SwapColors: 'Pixel.Tool.SwapColors',
    SetOptions: 'Pixel.Tool.SetOptions'
  },
  Document: {
    DrawStroke: 'Pixel.Document.DrawStroke',
    Fill: 'Pixel.Document.Fill',
    DrawShape: 'Pixel.Document.DrawShape',
    GradientFill: 'Pixel.Document.GradientFill',
    PickColor: 'Pixel.Document.PickColor',
    SetForeground: 'Pixel.Document.SetForeground',
    SetBackground: 'Pixel.Document.SetBackground',
    Undo: 'Pixel.Document.Undo',
    Redo: 'Pixel.Document.Redo',
    SetZoom: 'Pixel.Document.SetZoom',
    SetPan: 'Pixel.Document.SetPan',
    SetGrid: 'Pixel.Document.SetGrid',
    SetCheckerboard: 'Pixel.Document.SetCheckerboard',
    SetCanvasBackground: 'Pixel.Document.SetCanvasBackground',
    ApplyPalettePreset: 'Pixel.Document.ApplyPalettePreset',
    SelectAll: 'Pixel.Document.SelectAll',
    MoveSelection: 'Pixel.Document.MoveSelection',
    ClearSelection: 'Pixel.Document.ClearSelection'
  },
  Layer: {
    Add: 'Pixel.Layer.Add',
    Delete: 'Pixel.Layer.Delete',
    Rename: 'Pixel.Layer.Rename',
    Reorder: 'Pixel.Layer.Reorder',
    SetVisible: 'Pixel.Layer.SetVisible',
    SetLocked: 'Pixel.Layer.SetLocked',
    SetActive: 'Pixel.Layer.SetActive',
    MergeVisible: 'Pixel.Layer.MergeVisible'
  },
  Catalog: {
    File: {
      Create: 'Pixel.Catalog.File.Create',
      ImportFromImage: 'Pixel.Catalog.File.ImportFromImage',
      Rename: 'Pixel.Catalog.File.Rename',
      SoftDelete: 'Pixel.Catalog.File.SoftDelete',
      Restore: 'Pixel.Catalog.File.Restore',
      Purge: 'Pixel.Catalog.File.Purge'
    }
  }
} as const

export type PixelCommandType = typeof PixelCmd[keyof typeof PixelCmd] extends infer T
  ? T extends Record<string, string>
    ? T[keyof T]
    : T extends Record<string, Record<string, string>>
      ? T[keyof T][keyof T[keyof T]]
      : never
  : never

export interface PixelCommandEnvelope {
  type: string
  payload?: Record<string, unknown>
}

export interface PixelCommandResult {
  ok: boolean
  code?: string
  message?: string
  data?: unknown
}

export interface PixelCommandContext {
  sessionId: string | null
  fileId: string | null
}
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import type { IPixelEditorPort } from '@modules/library/pixel-art/services/IPixelEditorPort'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'
import type { TransactionManager } from '@app/transaction'
import {
  registerCanvasCommands,
  registerCatalogCommands,
  registerFileCommands,
  registerLayerCommands,
  registerToolSelectCommand,
  type FileCommandDeps
} from '@modules/library/pixel-art/app/command/handlers'

export interface IPixelCommandBus {
  dispatch(cmd: PixelCommandEnvelope): Promise<PixelCommandResult>
  dispatchBatch(
    cmds: PixelCommandEnvelope[],
    options?: { stopOnError?: boolean }
  ): Promise<PixelCommandResult[]>
  onResult(handler: (cmd: PixelCommandEnvelope, result: PixelCommandResult) => void): () => void
}

export type PixelCommandHandler = (
  cmd: PixelCommandEnvelope,
  ctx: PixelCommandContext
) => PixelCommandResult | Promise<PixelCommandResult>

export class PixelCommandRegistry {
  private readonly handlers = new Map<string, PixelCommandHandler>()

  register(type: string, handler: PixelCommandHandler): void {
    this.handlers.set(type, handler)
  }

  canHandle(type: string): boolean {
    return this.handlers.has(type)
  }

  async execute(cmd: PixelCommandEnvelope, ctx: PixelCommandContext): Promise<PixelCommandResult> {
    const handler = this.handlers.get(cmd.type)
    if (!handler) return { ok: false, code: 'UNKNOWN_COMMAND', message: `无处理器: ${cmd.type}` }
    return handler(cmd, ctx)
  }
}

function ok(data?: unknown): PixelCommandResult {
  return { ok: true, data }
}

function fail(code: string, message: string): PixelCommandResult {
  return { ok: false, code, message }
}

export { ok as pixelCmdOk, fail as pixelCmdFail }

export interface RegisterPixelCommandsDeps extends FileCommandDeps {
  getSession: () => PixelEditorSession | null
  getPort: () => IPixelEditorPort | null
  getTransactionManager?: () => TransactionManager | null
  repo: PixelRepositoryIpcAdapter
  onChange?: () => void
  setActiveTool?: (tool: ToolId) => void
  getActiveTool?: () => ToolId
}

export type CreatePixelCommandBusOptions = RegisterPixelCommandsDeps

export function registerPixelCommands(deps: RegisterPixelCommandsDeps): PixelCommandRegistry {
  const registry = new PixelCommandRegistry()
  const shared = {
    getPort: deps.getPort,
    getSession: deps.getSession,
    getTransactionManager: deps.getTransactionManager,
    onChange: deps.onChange
  }
  registerCanvasCommands(registry, shared)
  registerToolSelectCommand(registry, {
    ...shared,
    setActiveTool: deps.setActiveTool,
    getActiveTool: deps.getActiveTool
  })
  registerLayerCommands(registry, shared)
  registerFileCommands(registry, deps)
  registerCatalogCommands(registry, { repo: deps.repo })
  return registry
}

class PixelCommandBus implements IPixelCommandBus {
  private readonly registry: PixelCommandRegistry
  private readonly getSession: () => PixelEditorSession | null
  private readonly listeners = new Set<
    (cmd: PixelCommandEnvelope, result: PixelCommandResult) => void
  >()

  constructor(registry: PixelCommandRegistry, getSession: () => PixelEditorSession | null) {
    this.registry = registry
    this.getSession = getSession
  }

  private buildContext(): PixelCommandContext {
    const session = this.getSession()
    return {
      sessionId: session?.sessionId ?? null,
      fileId: session?.fileId ?? null
    }
  }

  async dispatch(cmd: PixelCommandEnvelope): Promise<PixelCommandResult> {
    const result = await this.registry.execute(cmd, this.buildContext())
    for (const listener of this.listeners) listener(cmd, result)
    return result
  }

  async dispatchBatch(
    cmds: PixelCommandEnvelope[],
    options?: { stopOnError?: boolean }
  ): Promise<PixelCommandResult[]> {
    const stopOnError = options?.stopOnError !== false
    const results: PixelCommandResult[] = []
    for (const cmd of cmds) {
      const result = await this.dispatch(cmd)
      results.push(result)
      if (stopOnError && !result.ok) break
    }
    return results
  }

  onResult(handler: (cmd: PixelCommandEnvelope, result: PixelCommandResult) => void): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }
}

export function createPixelCommandBus(options: CreatePixelCommandBusOptions): IPixelCommandBus {
  const registry = registerPixelCommands(options)
  return new PixelCommandBus(registry, options.getSession)
}
