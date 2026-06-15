import { describe, expect, it, vi } from 'vitest'
import { registerDocumentContentCommands } from '@modules/library/diagrams/app/command/documentContentCommands'
import { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { TransactionManager } from '@app/transaction'

function baseCtx(overrides: {
  port?: Partial<LogicFlowDiagramAdapter>
  tx?: Partial<TransactionManager> | null
  session?: Partial<DiagramEditorSession>
} = {}): DiagramCommandExecutionContext {
  const session = {
    markActivePageDirty: vi.fn(),
    ...overrides.session
  } as unknown as DiagramEditorSession

  const port = {
    getLogicFlow: () => ({ getNodeModelById: () => ({ x: 0, y: 0, width: 100, height: 60 }) }),
    updateNodeProperties: vi.fn(),
    captureSelectionIds: () => ({ nodeIds: ['n1'], edgeIds: [] }),
    getGraph: () => ({ nodes: [{ id: 'n1' }], edges: [] }),
    withUndoRedoRestoreAsync: vi.fn(async <T>(fn: () => Promise<T>) => fn()) as LogicFlowDiagramAdapter['withUndoRedoRestoreAsync'],
    ...overrides.port
  } as unknown as LogicFlowDiagramAdapter

  return {
    command: { sessionId: 's1', fileId: 'f1', activePageId: 'p1' },
    session,
    port,
    tx: (overrides.tx === undefined ? null : overrides.tx) as TransactionManager | null,
    repo: {} as never
  }
}

describe('ModifyNode command', () => {
  it('calls updateNodeProperties without throwing when port exposes getLogicFlow', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const updateNodeProperties = vi.fn()
    const ctx = baseCtx({
      port: {
        updateNodeProperties
      }
    })

    const result = await registry.execute(
      DiagramCmd.Document.ModifyNode,
      { nodeId: 'n1', nodeProps: { fill: '#ff0000' } },
      ctx
    )

    expect(result.ok).toBe(true)
    expect(updateNodeProperties).toHaveBeenCalledWith({ id: 'n1', fill: '#ff0000' })
  })
})

describe('FinishDrag command', () => {
  it('no-ops when before and after graphs are equal', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const runInTransaction = vi.fn()
    const graph = { nodes: [{ id: 'n1', x: 0, y: 0 }], edges: [] }
    const selection = { nodeIds: ['n1'], edgeIds: [] as string[] }

    const result = await registry.execute(
      DiagramCmd.Document.FinishDrag,
      {
        beforeGraph: graph,
        afterGraph: graph,
        beforeSelection: selection,
        afterSelection: selection
      },
      baseCtx({
        tx: { runInTransaction, apply: vi.fn() } as unknown as TransactionManager
      })
    )

    expect(result.ok).toBe(true)
    expect(runInTransaction).not.toHaveBeenCalled()
  })

  it('writes a transaction when graphs differ', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const apply = vi.fn().mockResolvedValue({ ok: true })
    const runInTransaction = vi.fn(async (_label, fn) => fn({ id: 'scope-1' }))

    const beforeGraph = { nodes: [{ id: 'n1', x: 0, y: 0 }], edges: [] }
    const afterGraph = { nodes: [{ id: 'n1', x: 10, y: 0 }], edges: [] }
    const selection = { nodeIds: ['n1'], edgeIds: [] as string[] }

    const result = await registry.execute(
      DiagramCmd.Document.FinishDrag,
      {
        beforeGraph,
        afterGraph,
        beforeSelection: selection,
        afterSelection: selection
      },
      baseCtx({
        tx: { runInTransaction, apply } as unknown as TransactionManager
      })
    )

    expect(result.ok).toBe(true)
    expect(runInTransaction).toHaveBeenCalledWith('移动图元', expect.any(Function))
    expect(apply).toHaveBeenCalled()
  })
})

describe('FormatPainterApply command', () => {
  it('applies node style snapshot via mutation', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const lf = {
      getNodeModelById: () => ({
        type: 'rect',
        properties: { style: {} },
        style: {},
        setStyles: vi.fn()
      }),
      setProperties: vi.fn()
    }
    const ctx = baseCtx({
      port: {
        getLogicFlow: () => lf,
        updateNodeProperties: vi.fn()
      }
    })

    const result = await registry.execute(
      DiagramCmd.Document.FormatPainterApply,
      {
        targetId: 'n1',
        kind: 'node',
        nodeSnapshot: {
          fill: '#ff0000',
          stroke: '#000',
          strokeWidth: 1,
          strokeDasharray: '',
          shadow: 'none',
          textStyle: { fontSize: 12, color: '#000', fontFamily: '', textAlign: 'center', fontWeight: 'normal', fontStyle: 'normal', underline: false, strikethrough: false },
          isGroupFrame: false
        }
      },
      ctx
    )

    expect(result.ok).toBe(true)
  })
})

describe('InsertNodeOnEdge command', () => {
  it('returns ok when split succeeds', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const lf = {
      getEdgeModelById: () => ({
        sourceNodeId: 's1',
        targetNodeId: 't1',
        type: 'polyline',
        properties: {},
        text: ''
      }),
      getNodeModelById: (id: string) => ({ id, x: 0, y: 0, width: 80, height: 40 }),
      deleteEdge: vi.fn(),
      addEdge: vi.fn()
    }
    const select = vi.fn()
    const ctx = baseCtx({
      port: {
        getLogicFlow: () => lf,
        select
      }
    })

    const result = await registry.execute(
      DiagramCmd.Document.InsertNodeOnEdge,
      { nodeId: 'n1', edgeId: 'e1' },
      ctx
    )

    expect(result.ok).toBe(true)
    expect(lf.deleteEdge).toHaveBeenCalledWith('e1')
    expect(select).toHaveBeenCalledWith(['n1'])
  })
})

describe('Undo/Redo commands', () => {
  it('Undo invokes tx.undo inside withUndoRedoRestoreAsync', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const undo = vi.fn().mockResolvedValue({ ok: true })
    const withUndoRedoRestoreAsync = vi.fn(async <T>(fn: () => Promise<T>) => fn()) as LogicFlowDiagramAdapter['withUndoRedoRestoreAsync']

    const ctx = baseCtx({
      port: { withUndoRedoRestoreAsync },
      tx: {
        canUndo: () => true,
        canRedo: () => false,
        undo,
        redo: vi.fn()
      } as unknown as TransactionManager
    })

    const result = await registry.execute(DiagramCmd.Document.Undo, undefined, ctx)

    expect(result.ok).toBe(true)
    expect(withUndoRedoRestoreAsync).toHaveBeenCalled()
    expect(undo).toHaveBeenCalled()
    expect(ctx.session!.markActivePageDirty).toHaveBeenCalled()
  })

  it('Redo invokes tx.redo inside withUndoRedoRestoreAsync', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const redo = vi.fn().mockResolvedValue({ ok: true })
    const withUndoRedoRestoreAsync = vi.fn(async <T>(fn: () => Promise<T>) => fn()) as LogicFlowDiagramAdapter['withUndoRedoRestoreAsync']

    const ctx = baseCtx({
      port: { withUndoRedoRestoreAsync },
      tx: {
        canUndo: () => false,
        canRedo: () => true,
        undo: vi.fn(),
        redo
      } as unknown as TransactionManager
    })

    const result = await registry.execute(DiagramCmd.Document.Redo, undefined, ctx)

    expect(result.ok).toBe(true)
    expect(withUndoRedoRestoreAsync).toHaveBeenCalled()
    expect(redo).toHaveBeenCalled()
    expect(ctx.session!.markActivePageDirty).toHaveBeenCalled()
  })
})
