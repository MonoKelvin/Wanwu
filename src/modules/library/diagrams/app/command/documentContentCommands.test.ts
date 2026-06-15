import { describe, expect, it, vi } from 'vitest'
import { registerDocumentContentCommands } from '@modules/library/diagrams/app/command/documentContentCommands'
import { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'

describe('ModifyNode command', () => {
  it('calls updateNodeProperties without throwing when port exposes getLogicFlow', async () => {
    const registry = new DiagramCommandRegistry()
    registerDocumentContentCommands(registry)

    const updateNodeProperties = vi.fn()
    const port = {
      getLogicFlow: () => ({ getNodeModelById: () => ({ x: 0, y: 0, width: 100, height: 60 }) }),
      updateNodeProperties,
      captureSelectionIds: () => ({ nodeIds: ['n1'], edgeIds: [] }),
      getGraph: () => ({ nodes: [{ id: 'n1' }], edges: [] })
    } as unknown as LogicFlowDiagramAdapter

    const session = { markActivePageDirty: vi.fn() } as unknown as DiagramEditorSession

    const result = await registry.execute(
      DiagramCmd.Document.ModifyNode,
      { nodeId: 'n1', nodeProps: { fill: '#ff0000' } },
      {
        command: { sessionId: 's1', fileId: 'f1', activePageId: 'p1' },
        session,
        port,
        tx: null,
        repo: {} as never
      }
    )

    expect(result.ok).toBe(true)
    expect(updateNodeProperties).toHaveBeenCalledWith({ id: 'n1', fill: '#ff0000' })
  })
})
