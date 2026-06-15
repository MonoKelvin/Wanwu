import type { CommandContext } from '../domain/types'

export interface CommandDescriptor {
  readonly type: string
  readonly title: string
  readonly category?: string
  readonly description?: string
  readonly canExecute?: (ctx: CommandContext) => boolean
}

export class CommandCatalog {
  private readonly descriptors = new Map<string, CommandDescriptor>()

  register(descriptor: CommandDescriptor): void {
    this.descriptors.set(descriptor.type, descriptor)
  }

  unregister(type: string): void {
    this.descriptors.delete(type)
  }

  get(type: string): CommandDescriptor | undefined {
    return this.descriptors.get(type)
  }

  list(): readonly CommandDescriptor[] {
    return [...this.descriptors.values()]
  }

  listExecutable(ctx: CommandContext): readonly CommandDescriptor[] {
    return this.list().filter((d) => !d.canExecute || d.canExecute(ctx))
  }
}
