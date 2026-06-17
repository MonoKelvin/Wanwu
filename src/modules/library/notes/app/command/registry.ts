/**
 * 便笺命令注册表：命令基类、注册与查找。
 */
import type { INotesRepositoryPort } from '@modules/library/notes/app/notesRepository'
import type { NoteCommandId, NoteCommandResult } from '@modules/library/notes/app/command/types'
import { noteFail } from '@modules/library/notes/app/command/types'

export interface NoteCommandExecutionContext {
  repo: INotesRepositoryPort
}

export interface INoteAppCommand {
  readonly id: NoteCommandId
  readonly title: string
  execute(params: unknown | undefined, ctx: NoteCommandExecutionContext): Promise<NoteCommandResult>
}

export abstract class NoteAppCommandBase implements INoteAppCommand {
  abstract readonly id: NoteCommandId
  abstract readonly title: string

  protected castParams<P>(params: unknown | undefined): P {
    return (params ?? {}) as P
  }

  abstract execute(
    params: unknown | undefined,
    ctx: NoteCommandExecutionContext
  ): Promise<NoteCommandResult>
}

export type NoteCommandFactory = (params: unknown | undefined) => INoteAppCommand

export class NoteCommandRegistry {
  private readonly singletons = new Map<NoteCommandId, INoteAppCommand>()
  private readonly factories = new Map<NoteCommandId, NoteCommandFactory>()

  registerSingleton(command: INoteAppCommand): this {
    this.singletons.set(command.id, command)
    return this
  }

  registerFactory(id: NoteCommandId, factory: NoteCommandFactory): this {
    this.factories.set(id, factory)
    return this
  }

  has(id: string): id is NoteCommandId {
    return this.singletons.has(id as NoteCommandId) || this.factories.has(id as NoteCommandId)
  }

  ids(): NoteCommandId[] {
    return [...new Set([...this.singletons.keys(), ...this.factories.keys()])]
  }

  async execute(
    id: NoteCommandId,
    params: unknown | undefined,
    ctx: NoteCommandExecutionContext
  ): Promise<NoteCommandResult> {
    const singleton = this.singletons.get(id)
    if (singleton) return singleton.execute(params, ctx)

    const factory = this.factories.get(id)
    if (!factory) return noteFail('UNKNOWN_COMMAND', `未注册的命令: ${id}`)

    return factory(params).execute(params, ctx)
  }
}

export function createNoteCommandRegistry(): NoteCommandRegistry {
  return new NoteCommandRegistry()
}
