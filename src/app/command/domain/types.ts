export interface CommandContext {
  readonly scopeId: string
  readonly services: Readonly<Record<string, unknown>>
}

export interface CommandMeta {
  readonly name: string
  readonly type: string
  readonly issuedAt: string
  readonly source?: 'ui' | 'api' | 'script' | 'system'
  readonly extras?: Record<string, unknown>
}

export type CommandResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; code: string; message: string }

export interface ICommand<TPayload = unknown> {
  readonly meta: CommandMeta
  readonly payload: TPayload
}

export interface CommandExecutionEntry {
  readonly id: string
  readonly name: string
  readonly type: string
  readonly payload: unknown
  readonly issuedAt: string
  readonly source?: CommandMeta['source']
  readonly result: 'success' | 'failure'
  readonly errorCode?: string
  readonly errorMessage?: string
  readonly extras?: Record<string, unknown>
}

export function cmdOk<T>(data?: T): CommandResult<T> {
  return { ok: true, data }
}

export function cmdFail(code: string, message: string): CommandResult {
  return { ok: false, code, message }
}
