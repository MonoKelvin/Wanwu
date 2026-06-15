import type {
  ITransactionUnit,
  OperationResult,
  TransactionContext,
  UnitMeta,
  UnitRecord
} from '../domain/types'

export abstract class UnitBase implements ITransactionUnit {
  abstract readonly meta: UnitMeta

  abstract apply(ctx: TransactionContext): OperationResult | Promise<OperationResult>
  abstract revert(ctx: TransactionContext): OperationResult | Promise<OperationResult>
  abstract toRecord(): UnitRecord

  readonly transparent?: boolean
  readonly recordable?: boolean
}
