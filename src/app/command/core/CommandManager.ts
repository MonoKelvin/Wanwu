import type {
  CommandContext,
  CommandExecutionEntry,
  CommandResult,
  ICommand
} from '../domain/types'
import { cmdFail } from '../domain/types'
import { CommandDispatcher } from './CommandDispatcher'
import { CommandExecutionLog } from '../CommandExecutionLog'
import { clonePayload, createId, nowIso } from '../utils'
import type { CommandManagerOptions, DispatchOptions } from './CommandManagerOptions'
import { getCommandDurationMs } from './builtInMiddleware'

export class CommandManager {
  private readonly options: Required<CommandManagerOptions>
  private dispatchQueue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly dispatcher: CommandDispatcher,
    private readonly log: CommandExecutionLog,
    options?: CommandManagerOptions
  ) {
    this.options = {
      maxLogEntries: options?.maxLogEntries ?? 200,
      recordPolicy: options?.recordPolicy ?? 'all'
    }
  }

  dispatch<T>(
    command: ICommand,
    ctx: CommandContext,
    options?: DispatchOptions
  ): Promise<CommandResult<T>> {
    return this.enqueue(() => this.dispatchInternal(command, ctx, options))
  }

  async repeatLast(ctx: CommandContext): Promise<CommandResult> {
    const last = this.getLastEntry()
    if (!last) return cmdFail('CMD_NO_LAST_ENTRY', 'No previous command entry')
    return this.dispatch(
      {
        meta: {
          name: last.name,
          type: last.type,
          issuedAt: nowIso(),
          source: last.source
        },
        payload: last.payload
      },
      ctx
    )
  }

  getLastEntry(): CommandExecutionEntry | null {
    const recent = this.log.getRecent(1)
    return recent[0] ?? null
  }

  dispatchBatch(commands: ICommand[], ctx: CommandContext): Promise<CommandResult[]> {
    return this.enqueue(() => this.dispatcher.dispatchBatch(commands, ctx))
  }

  getLog(): readonly CommandExecutionEntry[] {
    return this.log.getAll()
  }

  getRecent(limit = 20): readonly CommandExecutionEntry[] {
    return this.log.getRecent(limit)
  }

  findByType(type: string): readonly CommandExecutionEntry[] {
    return this.log.getAll().filter((e) => e.type === type)
  }

  clearLog(): void {
    this.log.clear()
  }

  onLogChange(listener: (entries: readonly CommandExecutionEntry[]) => void): () => void {
    return this.log.onChange(listener)
  }

  private async dispatchInternal<T>(
    command: ICommand,
    ctx: CommandContext,
    options?: DispatchOptions
  ): Promise<CommandResult<T>> {
    const result = await this.dispatcher.dispatch<T>(command, ctx)

    const shouldRecord = this.shouldRecord(result, command, options)
    if (shouldRecord) {
      this.appendEntry(command, result)
    }

    return result
  }

  private shouldRecord(
    result: CommandResult,
    command: ICommand,
    options?: DispatchOptions
  ): boolean {
    if (options?.record === false) return false
    if (result.ok === false && result.code === 'CMD_UNKNOWN_TYPE') return false

    const recordOnFailure = options?.recordOnFailure ?? this.options.recordPolicy !== 'success-only'
    if (!result.ok && !recordOnFailure) return false
    if (result.ok && this.options.recordPolicy === 'failure-only') return false

    return true
  }

  private appendEntry(command: ICommand, result: CommandResult): void {
    const durationMs = getCommandDurationMs(command)
    const entry: CommandExecutionEntry = {
      id: createId(),
      name: command.meta.name,
      type: command.meta.type,
      payload: clonePayload(command.payload),
      issuedAt: command.meta.issuedAt,
      source: command.meta.source,
      result: result.ok ? 'success' : 'failure',
      errorCode: result.ok ? undefined : result.code,
      errorMessage: result.ok ? undefined : result.message,
      extras: {
        ...command.meta.extras,
        ...(durationMs !== undefined ? { durationMs } : {})
      }
    }
    this.log.append(entry)
  }

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.dispatchQueue.then(fn)
    this.dispatchQueue = run.then(
      () => undefined,
      () => undefined
    )
    return run
  }
}
