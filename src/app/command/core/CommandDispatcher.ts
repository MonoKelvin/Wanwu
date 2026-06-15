import type { CommandContext, CommandResult, ICommand } from '../domain/types'
import { cmdFail } from '../domain/types'
import { HandlerRegistry } from './HandlerRegistry'
import type { ICommandHandler } from './ICommandHandler'
import { CommandPipeline } from './CommandPipeline'

export class CommandDispatcher {
  constructor(
    private readonly registry: HandlerRegistry,
    private readonly pipeline: CommandPipeline
  ) {}

  dispatch<T>(command: ICommand, ctx: CommandContext): Promise<CommandResult<T>> {
    const run = async (): Promise<CommandResult<T>> => {
      let handler: ICommandHandler
      try {
        handler = this.registry.resolve(command.meta.type, ctx)
      } catch {
        return cmdFail('CMD_UNKNOWN_TYPE', `No handler for type: ${command.meta.type}`) as CommandResult<T>
      }

      try {
        return (await handler.handle(command, ctx)) as CommandResult<T>
      } catch (err) {
        return cmdFail(
          'CMD_HANDLER_THROW',
          err instanceof Error ? err.message : String(err)
        ) as CommandResult<T>
      }
    }

    return this.pipeline.invoke(command, ctx, run) as unknown as Promise<CommandResult<T>>
  }

  async dispatchBatch(commands: ICommand[], ctx: CommandContext): Promise<CommandResult[]> {
    const results: CommandResult[] = []
    for (const command of commands) {
      const result = await this.dispatch(command, ctx)
      results.push(result)
      if (!result.ok) break
    }
    return results
  }
}
