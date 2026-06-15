import type { CommandContext, CommandResult, ICommand } from '../domain/types'

export interface ICommandHandler<TCmd extends ICommand = ICommand, TResult = unknown> {
  readonly commandType: string
  handle(command: TCmd, ctx: CommandContext): CommandResult<TResult> | Promise<CommandResult<TResult>>
}

export interface ICommandHandlerFactory {
  readonly commandType: string
  createHandler(ctx: CommandContext): ICommandHandler
}
