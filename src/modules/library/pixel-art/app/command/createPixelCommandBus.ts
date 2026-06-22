import type {
  PixelCommandContext,
  PixelCommandEnvelope,
  PixelCommandResult
} from '@modules/library/pixel-art/app/command/domain/types'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { PixelCommandRegistry } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { registerPixelCommands, type RegisterPixelCommandsDeps } from '@modules/library/pixel-art/app/command/registerPixelCommands'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'

export interface CreatePixelCommandBusOptions extends RegisterPixelCommandsDeps {
  getSession: () => PixelEditorSession | null
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
