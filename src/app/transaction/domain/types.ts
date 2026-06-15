export interface TransactionContext {
  readonly resourceId: string
  readonly services: Readonly<Record<string, unknown>>
}

export interface UnitMeta {
  readonly label: string
  readonly unitType: string
  readonly createdAt: string
  readonly extras?: Record<string, unknown>
}

export type OperationResult<T = unknown> =
  | { ok: true; data?: T }
  | { ok: false; code: string; message: string }

export interface UnitRecord {
  unitType: string
  codecId: string
  schemaVersion: number
  body: string
  meta: UnitMeta
}

export interface TransactionStep {
  readonly id: string
  readonly label: string
  readonly committedAt: string
  readonly units: readonly ITransactionUnit[]
  readonly visibility?: 'normal' | 'hidden'
  readonly groupId?: string | number
}

export interface StepRecord {
  id: string
  label: string
  committedAt: string
  units: UnitRecord[]
  visibility?: 'normal' | 'hidden'
  groupId?: string | number
}

export interface TransactionStackSnapshot {
  readonly steps: readonly TransactionStep[]
  readonly index: number
}

export interface TransactionChangeEvent {
  canUndo: boolean
  canRedo: boolean
  undoLabel: string | null
  redoLabel: string | null
  stepCount: number
  index: number
  isClean: boolean
}

export interface TransactionSnapshot {
  format: 'wanwu-transaction'
  formatVersion: 1
  resourceId: string
  index: number
  cleanIndex: number
  exportedAt: string
  steps: StepRecord[]
}

export interface ITransactionUnit {
  readonly meta: UnitMeta

  apply(ctx: TransactionContext): OperationResult | Promise<OperationResult>
  revert(ctx: TransactionContext): OperationResult | Promise<OperationResult>
  reapply?(ctx: TransactionContext): OperationResult | Promise<OperationResult>

  tryMerge?(previous: ITransactionUnit): ITransactionUnit | null

  readonly transparent?: boolean
  readonly recordable?: boolean

  toRecord(): UnitRecord
}

export interface ImportOptions {
  skipUnknown?: boolean
  autoReplay?: boolean
}

export function txOk<T>(data?: T): OperationResult<T> {
  return { ok: true, data }
}

export function txFail(code: string, message: string): OperationResult {
  return { ok: false, code, message }
}
