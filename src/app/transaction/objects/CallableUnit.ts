import type {
  ITransactionUnit,
  OperationResult,
  TransactionContext,
  UnitMeta,
  UnitRecord
} from '../domain/types'

export class CallableUnit implements ITransactionUnit {
  readonly transparent?: boolean
  readonly recordable?: boolean

  constructor(
    readonly meta: UnitMeta,
    private readonly applyFn: (ctx: TransactionContext) => OperationResult | Promise<OperationResult>,
    private readonly revertFn: (ctx: TransactionContext) => OperationResult | Promise<OperationResult>,
    options?: { transparent?: boolean; recordable?: boolean }
  ) {
    this.transparent = options?.transparent
    this.recordable = options?.recordable
  }

  apply(ctx: TransactionContext): OperationResult | Promise<OperationResult> {
    return this.applyFn(ctx)
  }

  revert(ctx: TransactionContext): OperationResult | Promise<OperationResult> {
    return this.revertFn(ctx)
  }

  toRecord(): UnitRecord {
    const err = new Error('CallableUnit cannot be serialized') as Error & { code: string }
    err.code = 'TX_NOT_SERIALIZABLE'
    throw err
  }
}

export function isNotSerializableError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === 'TX_NOT_SERIALIZABLE'
  )
}
