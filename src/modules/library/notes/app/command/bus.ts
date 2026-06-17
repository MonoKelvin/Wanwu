/**
 * 便笺命令总线：模块内 dispatch 入口，并接入全局 CommandManager 日志。
 */
import type { ICommand, CommandMeta } from '@app/command'
import { getCommandRuntime } from '@app/bootstrap/commandRuntimeStore'
import { createRegisteredNoteCommandRegistry } from '@modules/library/notes/app/command/commands'
import type { NoteCommandRegistry } from '@modules/library/notes/app/command/registry'
import {
  isNoteCommandId,
  noteCommandTitle,
  noteFail,
  type NoteCommandEnvelope,
  type NoteCommandResult
} from '@modules/library/notes/app/command/types'
import { PiniaNotesRepository, type INotesRepositoryPort } from '@modules/library/notes/app/notesRepository'

export interface INoteCommandBus {
  dispatch(cmd: NoteCommandEnvelope): Promise<NoteCommandResult>
}

export interface CreateNoteCommandBusOptions {
  repo: INotesRepositoryPort
  registry?: NoteCommandRegistry
}

export function noteEnvelopeToCommand(
  cmd: NoteCommandEnvelope,
  source: CommandMeta['source'] = cmd.source ?? 'ui'
): ICommand {
  return {
    meta: {
      name: noteCommandTitle(cmd.type),
      type: cmd.type,
      issuedAt: new Date().toISOString(),
      source
    },
    payload: cmd.payload ?? {}
  }
}

class NoteCommandBus implements INoteCommandBus {
  private readonly registry: NoteCommandRegistry
  private readonly repo: INotesRepositoryPort

  constructor(options: CreateNoteCommandBusOptions) {
    this.repo = options.repo
    this.registry = options.registry ?? createRegisteredNoteCommandRegistry()
  }

  async dispatch(cmd: NoteCommandEnvelope): Promise<NoteCommandResult> {
    if (!isNoteCommandId(cmd.type)) {
      return noteFail('UNKNOWN_COMMAND', `无处理器: ${cmd.type}`)
    }

    const result = await this.registry.execute(cmd.type, cmd.payload, { repo: this.repo })

    const runtime = getCommandRuntime()
    if (runtime) {
      void runtime.manager.dispatch(
        noteEnvelopeToCommand(cmd),
        { scopeId: 'module:notes', services: {} },
        { record: result.ok }
      )
    }

    return result
  }
}

let defaultBus: INoteCommandBus | null = null

export function createNoteCommandBus(options: CreateNoteCommandBusOptions): INoteCommandBus {
  return new NoteCommandBus(options)
}

export function getNoteCommandBus(): INoteCommandBus {
  if (!defaultBus) {
    defaultBus = createNoteCommandBus({ repo: new PiniaNotesRepository() })
  }
  return defaultBus
}

export function resetNoteCommandBusForTests(): void {
  defaultBus = null
}
