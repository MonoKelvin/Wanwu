import { describe, expect, it } from 'vitest'
import {
  countGraphElements,
  guardGraphRevert,
  isValidGraphSnapshot
} from '@modules/library/diagrams/app/transaction/diagramGraphSnapshotGuard'

describe('diagramGraphSnapshotGuard', () => {
  it('rejects revert to empty when current has nodes', () => {
    const current = { nodes: [{ id: '1' }], edges: [] }
    const empty = { nodes: [], edges: [] }
    expect(isValidGraphSnapshot(empty)).toBe(true)
    const guard = guardGraphRevert(current, empty, 'revert')
    expect(guard?.ok).toBe(false)
  })

  it('allows revert to non-empty snapshot', () => {
    const current = { nodes: [{ id: '1' }, { id: '2' }], edges: [] }
    const before = { nodes: [{ id: '1' }], edges: [] }
    expect(guardGraphRevert(current, before, 'revert')).toBeNull()
  })

  it('counts graph elements', () => {
    expect(countGraphElements({ nodes: [1, 2], edges: [3] })).toEqual({ nodes: 2, edges: 1 })
  })
})
