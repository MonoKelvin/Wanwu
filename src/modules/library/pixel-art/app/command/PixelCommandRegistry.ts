import type {
  PixelCommandContext,
  PixelCommandEnvelope,
  PixelCommandResult
} from '@modules/library/pixel-art/app/command/domain/types'

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
