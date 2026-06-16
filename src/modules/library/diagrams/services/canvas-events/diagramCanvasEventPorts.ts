import type LogicFlow from '@logicflow/core'
import type { DiagramCanvasTheme } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import type { DiagramCanvasViewportController } from '@modules/library/diagrams/services/diagramCanvasViewportController'
import type { DiagramEdgeInsertCoordinator } from '@modules/library/diagrams/services/diagramEdgeInsertCoordinator'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import type { DiagramFormatPainterCoordinator } from '@modules/library/diagrams/services/diagramFormatPainterCoordinator'
import type { DiagramDocumentFormatPainterApplyParams } from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'

export interface DiagramCanvasEventBinderPorts {
  getLf(): LogicFlow
  getContainer(): HTMLElement | null
  getCanvasSettings(): DiagramCanvasSettings
  getResolvedTheme(): DiagramCanvasTheme
  boxSelect: DiagramBoxSelectCoordinator
  viewport: DiagramCanvasViewportController
  groupFrames: DiagramGroupFrameCoordinator
  edgeInsert: DiagramEdgeInsertCoordinator
  selectionBridge: DiagramEditorSelectionBridge
  getClickSelectionSnapshot(e?: MouseEvent | PointerEvent | null): string[]
  scheduleGraphChange(): void
  notifyUserSelectionChange(): void
  publishSelection(): void
  selectNodeForPropertyPanel(nodeId: string, event?: PointerEvent): void
  scheduleMultiSelectOverlayRefresh(): void
  scheduleOverlayLayout(): void
  refreshMultiSelectResize(): void
  scheduleResizeFollowUp(nodeId: string): void
  countSelectedNodes(): number
  getSelectedNodeIds(): string[]
  getSelectedContentNodeIds(): string[]
  formatPainter: DiagramFormatPainterCoordinator
  isGroupFrameId(nodeId: string): boolean
  applyDefaultEdgeStyle(edgeId: string): void
  patchBackgroundDom(color: string): void
  onViewportChange(): void
  onFormatPainterNodeApplied(nodeId: string): void
  requestFormatPainterApply(payload: DiagramDocumentFormatPainterApplyParams): void
  captureDragUndoBaseline(): void
  clearDragUndoBaseline(): void
  commitDragUndoMutation(): void
  modifyNode(nodeId: string, patch: Record<string, unknown>): void
}
