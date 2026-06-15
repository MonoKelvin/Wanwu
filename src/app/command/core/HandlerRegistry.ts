import type { CommandContext } from '../domain/types'
import type { ICommandHandler, ICommandHandlerFactory } from './ICommandHandler'

type HandlerEntry = ICommandHandler | ICommandHandlerFactory

export class HandlerRegistry {
  private readonly handlers = new Map<string, HandlerEntry>()

  register(handler: ICommandHandler): void {
    if (this.handlers.has(handler.commandType)) {
      console.warn(`[HandlerRegistry] Overwriting handler for type: ${handler.commandType}`)
    }
    this.handlers.set(handler.commandType, handler)
  }

  registerFactory(factory: ICommandHandlerFactory): void {
    if (this.handlers.has(factory.commandType)) {
      console.warn(`[HandlerRegistry] Overwriting factory for type: ${factory.commandType}`)
    }
    this.handlers.set(factory.commandType, factory)
  }

  unregister(type: string): void {
    this.handlers.delete(type)
  }

  has(type: string): boolean {
    return this.handlers.has(type)
  }

  resolve(type: string, ctx: CommandContext): ICommandHandler {
    const entry = this.handlers.get(type)
    if (!entry) {
      throw new Error(`CMD_UNKNOWN_TYPE: ${type}`)
    }
    if ('createHandler' in entry) {
      return entry.createHandler(ctx)
    }
    return entry
  }
}
