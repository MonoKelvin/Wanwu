import { describe, expect, it } from 'vitest'
import type { ITransactionUnit, OperationResult, TransactionContext } from '@app/transaction'
import { runDiagramCommandTransaction } from '@modules/library/diagrams/app/transaction/canvasTransaction'

class FlagUnit implements ITransactionUnit {
  readonly meta = {
    label: 'flag',
    unitType: 'test.flag',
    createdAt: new Date().toISOString()
  }

  constructor(private readonly flag: { applied: boolean }) {}

  apply(_ctx: TransactionContext): Promise<OperationResult> {
    this.flag.applied = true
    return Promise.resolve({ ok: true })
  }

  revert(_ctx: TransactionContext): OperationResult {
    return { ok: true }
  }

  reapply(_ctx: TransactionContext): OperationResult {
    return { ok: true }
  }

  toRecord() {
    throw new Error('not serializable')
  }
}

describe('runDiagramCommandTransaction', () => {
  it('applies units directly when transaction manager is missing', async () => {
    const flag = { applied: false }

    const result = await runDiagramCommandTransaction(null, 'test', async (applyUnit) => {
      const applied = await applyUnit(new FlagUnit(flag))
      if (!applied.ok) return { ok: false, code: 'INTERNAL', message: applied.message }
      return { ok: true }
    })

    expect(result.ok).toBe(true)
    expect(flag.applied).toBe(true)
  })
})
