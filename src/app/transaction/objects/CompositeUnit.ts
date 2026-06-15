import type {
  ITransactionUnit,
  OperationResult,
  TransactionContext,
  UnitMeta,
  UnitRecord
} from '../domain/types'
import { txFail, txOk } from '../domain/types'

export interface CompositeUnitBody {
  children: UnitRecord[]
}

export class CompositeUnit implements ITransactionUnit {
  readonly meta: UnitMeta
  readonly transparent?: boolean
  readonly recordable?: boolean

  constructor(
    meta: UnitMeta,
    private readonly children: ITransactionUnit[],
    options?: { transparent?: boolean; recordable?: boolean }
  ) {
    this.meta = meta
    this.transparent = options?.transparent
    this.recordable = options?.recordable
  }

  async apply(ctx: TransactionContext): Promise<OperationResult> {
    for (const child of this.children) {
      const result = await child.apply(ctx)
      if (!result.ok) return result
    }
    return txOk()
  }

  async revert(ctx: TransactionContext): Promise<OperationResult> {
    for (let i = this.children.length - 1; i >= 0; i -= 1) {
      const result = await this.children[i]!.revert(ctx)
      if (!result.ok) return result
    }
    return txOk()
  }

  async reapply(ctx: TransactionContext): Promise<OperationResult> {
    for (const child of this.children) {
      const fn = child.reapply ?? child.apply
      const result = await fn.call(child, ctx)
      if (!result.ok) return result
    }
    return txOk()
  }

  toRecord(): UnitRecord {
    return {
      unitType: 'core.composite',
      codecId: 'json',
      schemaVersion: 1,
      body: JSON.stringify({
        children: this.children.map((c) => c.toRecord())
      } satisfies CompositeUnitBody),
      meta: this.meta
    }
  }
}

export function createCompositeUnitFactory(
  resolveUnit: (record: UnitRecord) => ITransactionUnit
): { unitType: string; create(decoded: unknown): ITransactionUnit } {
  return {
    unitType: 'core.composite',
    create(decoded: unknown) {
      const body = decoded as CompositeUnitBody
      const children = body.children.map((record) => resolveUnit(record))
      const meta = children[0]?.meta ?? {
        label: '组合',
        unitType: 'core.composite',
        createdAt: new Date().toISOString()
      }
      return new CompositeUnit(meta, children)
    }
  }
}
