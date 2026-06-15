import { describe, expect, it, vi } from 'vitest'
import type { TransactionContext } from '@app/transaction'
import { DiagramNodeLayoutUnit } from '@modules/library/diagrams/app/transaction/DiagramNodeLayoutUnit'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'

const TX_CTX: TransactionContext = { resourceId: 'diagram:test', services: {} }

describe('DiagramNodeLayoutUnit', () => {
  it('apply/revert round-trips layout patch on node model', () => {
    const model = {
      id: 'n1',
      x: 100,
      y: 100,
      width: 80,
      height: 40,
      setProperties: vi.fn()
    }

    const lf = {
      getNodeModelById: (id: string) => (id === 'n1' ? model : undefined),
      graphModel: {
        getNodeEdges: () => [],
        moveNode2Coordinate: (_id: string, x: number, y: number) => {
          model.x = x
          model.y = y
        }
      }
    }

    const port = {
      getLogicFlow: () => lf,
      isUndoRedoRestoreActive: () => true,
      withUndoRedoRestore: <T>(fn: () => T) => fn(),
      refreshAfterLayoutChange: vi.fn()
    } as unknown as LogicFlowDiagramAdapter

    const before = { x: 100, y: 100 }
    const after = { x: 200, y: 200 }

    const unit = new DiagramNodeLayoutUnit({ nodeId: 'n1', before, after }, () => port)

    expect(unit.apply(TX_CTX).ok).toBe(true)
    expect(model.x).toBe(200)
    expect(model.y).toBe(200)

    expect(unit.revert(TX_CTX).ok).toBe(true)
    expect(model.x).toBe(100)
    expect(model.y).toBe(100)
  })
})
