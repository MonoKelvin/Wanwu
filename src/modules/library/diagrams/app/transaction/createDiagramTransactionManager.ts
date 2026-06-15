import {
  TransactionManager,
  UnitCodecRegistry,
  UnitRegistry,
  type TransactionContext,
  type TransactionManagerOptions
} from '@app/transaction'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import { createDiagramNodeLayoutUnitFactory } from '@modules/library/diagrams/app/transaction/DiagramNodeLayoutUnit'
import {
  attachDiagramTransactionSpill,
  DiagramTransactionStepSpill
} from '@modules/library/diagrams/app/transaction/DiagramTransactionStepSpill'

const DIAGRAM_TX_OPTIONS: TransactionManagerOptions = {
  /** 整图快照单元不可序列化，禁止 drop-oldest 丢弃（否则 undo 会恢复到空画布） */
  maxSteps: 0,
  enableMerge: true
}

export interface DiagramTransactionBundle {
  manager: TransactionManager
  spill: DiagramTransactionStepSpill
  detachSpill: () => void
  resourceId: string
}

export function createDiagramUnitRegistry(
  getPort: () => LogicFlowDiagramAdapter | null
): UnitRegistry {
  const registry = new UnitRegistry()
  registry.register(createDiagramNodeLayoutUnitFactory(getPort))
  return registry
}

export function createDiagramTransactionManager(
  fileId: string,
  session: DiagramEditorSession,
  port: LogicFlowDiagramAdapter
): DiagramTransactionBundle {
  const getPort = () => port
  const unitRegistry = createDiagramUnitRegistry(getPort)
  const unitCodecRegistry = new UnitCodecRegistry()

  const resourceId = `diagram:${fileId}`
  const ctx: TransactionContext = {
    resourceId,
    services: { session, port }
  }

  const manager = new TransactionManager(ctx, unitRegistry, unitCodecRegistry, DIAGRAM_TX_OPTIONS)
  const spill = new DiagramTransactionStepSpill()
  const detachSpill = attachDiagramTransactionSpill(resourceId, manager, spill)

  return { manager, spill, detachSpill, resourceId }
}
