import type { CommandContext, CommandResult, ICommand } from '../domain/types'

export interface ICommandMiddleware {
  readonly order: number
  invoke(
    command: ICommand,
    ctx: CommandContext,
    next: () => Promise<CommandResult>
  ): Promise<CommandResult>
}

export class CommandPipeline {
  private middlewares: ICommandMiddleware[] = []

  use(middleware: ICommandMiddleware): void {
    this.middlewares.push(middleware)
    this.middlewares.sort((a, b) => a.order - b.order)
  }

  async invoke(
    command: ICommand,
    ctx: CommandContext,
    terminal: () => Promise<CommandResult>
  ): Promise<CommandResult> {
    const chain = [...this.middlewares]
    const dispatch = (index: number): Promise<CommandResult> => {
      if (index >= chain.length) return terminal()
      const mw = chain[index]!
      return mw.invoke(command, ctx, () => dispatch(index + 1))
    }
    return dispatch(0)
  }
}
