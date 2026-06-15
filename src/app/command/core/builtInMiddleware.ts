import type { CommandContext, CommandResult, ICommand } from '../domain/types'
import type { ICommandMiddleware } from './CommandPipeline'
import type { CommandCatalog } from '../plugins/CommandCatalog'
import { cmdFail } from '../domain/types'

const durationMap = new WeakMap<ICommand, number>()

export function getCommandDurationMs(command: ICommand): number | undefined {
  return durationMap.get(command)
}

export class GuardMiddleware implements ICommandMiddleware {
  readonly order = 5

  constructor(private readonly catalog: CommandCatalog) {}

  async invoke(
    command: ICommand,
    ctx: CommandContext,
    next: () => Promise<CommandResult>
  ): Promise<CommandResult> {
    const descriptor = this.catalog.get(command.meta.type)
    if (descriptor?.canExecute && !descriptor.canExecute(ctx)) {
      return cmdFail('CMD_NOT_EXECUTABLE', `Command not executable: ${command.meta.type}`)
    }
    return next()
  }
}

export class TimingMiddleware implements ICommandMiddleware {
  readonly order = 90

  async invoke(
    _command: ICommand,
    _ctx: CommandContext,
    next: () => Promise<CommandResult>
  ): Promise<CommandResult> {
    const start = performance.now()
    const result = await next()
    durationMap.set(_command, Math.round(performance.now() - start))
    return result
  }
}
