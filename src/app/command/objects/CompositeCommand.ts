import type { CommandContext, CommandResult, ICommand } from '../domain/types'
import type { CommandDispatcher } from '../core/CommandDispatcher'

export class CompositeCommand implements ICommand {
  readonly meta: ICommand['meta']

  constructor(
    meta: ICommand['meta'],
    readonly payload: { commands: ICommand[] }
  ) {
    this.meta = meta
  }
}

export function createCompositeHandler(dispatcher: CommandDispatcher): {
  commandType: string
  handle(command: CompositeCommand, ctx: CommandContext): Promise<CommandResult>
} {
  return {
    commandType: 'core.composite',
    async handle(command, ctx) {
      const results = await dispatcher.dispatchBatch(command.payload.commands, ctx)
      const failed = results.find((r) => !r.ok)
      if (failed && !failed.ok) return failed
      return { ok: true, data: results }
    }
  }
}

export class CallableCommand implements ICommand {
  readonly meta: ICommand['meta']

  constructor(
    meta: ICommand['meta'],
    readonly payload: unknown,
    readonly handleFn: (command: ICommand, ctx: CommandContext) => CommandResult | Promise<CommandResult>
  ) {
    this.meta = meta
  }
}

export function createCallableHandler(): {
  commandType: string
  handle(command: CallableCommand, ctx: CommandContext): CommandResult | Promise<CommandResult>
} {
  return {
    commandType: 'core.callable',
    handle(command, ctx) {
      return command.handleFn(command, ctx)
    }
  }
}
