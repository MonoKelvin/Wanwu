import type LogicFlow from '@logicflow/core'
import type { DiagramDocumentFormatPainterApplyParams } from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'
import type { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import type { DiagramCanvasViewportController } from '@modules/library/diagrams/services/diagramCanvasViewportController'
import type { DiagramEdgeInsertCoordinator } from '@modules/library/diagrams/services/diagramEdgeInsertCoordinator'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import type { DiagramFormatPainterCoordinator } from '@modules/library/diagrams/services/diagramFormatPainterCoordinator'
import type { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'
import type { DiagramCanvasTheme } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'

export interface BuildLogicFlowCanvasEventPortsInput {
  lf: LogicFlow
  getContainer: () => HTMLElement | null
  getCanvasSettings: () => DiagramCanvasSettings
  getResolvedTheme: () => DiagramCanvasTheme
  boxSelect: DiagramBoxSelectCoordinator
  viewport: DiagramCanvasViewportController
  groupFrames: DiagramGroupFrameCoordinator
  edgeInsert: DiagramEdgeInsertCoordinator
  selectionBridge: DiagramEditorSelectionBridge
  formatPainter: DiagramFormatPainterCoordinator
  getClickSelectionSnapshot: (e?: MouseEvent | PointerEvent | null) => string[]
  scheduleGraphChange: () => void
  scheduleMultiSelectOverlayRefresh: () => void
  scheduleOverlayLayout: () => void
  refreshMultiSelectResize: () => void
  scheduleResizeFollowUp: (nodeId: string) => void
  countSelectedNodes: () => number
  getSelectedNodeIds: () => string[]
  getSelectedContentNodeIds: () => string[]
  isGroupFrameId: (id: string) => boolean
  applyDefaultEdgeStyle: (id: string) => void
  patchBackgroundDom: (color: string) => void
  onViewportChange: () => void
  requestFormatPainterApply: (payload: DiagramDocumentFormatPainterApplyParams) => void
  captureDragUndoBaseline: () => void
  clearDragUndoBaseline: () => void
  commitDragUndoMutation: () => void
}

/** 从适配器依赖组装画布事件绑定端口（减轻 LogicFlowDiagramAdapter 体积） */
export function buildLogicFlowCanvasEventPorts(
  input: BuildLogicFlowCanvasEventPortsInput
): DiagramCanvasEventBinderPorts {
  const { lf } = input
  return {
    getLf: () => lf,
    getContainer: input.getContainer,
    getCanvasSettings: input.getCanvasSettings,
    getResolvedTheme: input.getResolvedTheme,
    boxSelect: input.boxSelect,
    viewport: input.viewport,
    groupFrames: input.groupFrames,
    edgeInsert: input.edgeInsert,
    selectionBridge: input.selectionBridge,
    getClickSelectionSnapshot: input.getClickSelectionSnapshot,
    scheduleGraphChange: input.scheduleGraphChange,
    scheduleMultiSelectOverlayRefresh: input.scheduleMultiSelectOverlayRefresh,
    scheduleOverlayLayout: input.scheduleOverlayLayout,
    refreshMultiSelectResize: input.refreshMultiSelectResize,
    scheduleResizeFollowUp: input.scheduleResizeFollowUp,
    countSelectedNodes: input.countSelectedNodes,
    getSelectedNodeIds: input.getSelectedNodeIds,
    getSelectedContentNodeIds: input.getSelectedContentNodeIds,
    isGroupFrameId: input.isGroupFrameId,
    formatPainter: input.formatPainter,
    applyDefaultEdgeStyle: input.applyDefaultEdgeStyle,
    patchBackgroundDom: input.patchBackgroundDom,
    onViewportChange: input.onViewportChange,
    onFormatPainterNodeApplied: (nodeId) => {
      syncGroupFramesForNodes(lf, [nodeId])
      input.groupFrames.refreshDisplay()
    },
    requestFormatPainterApply: input.requestFormatPainterApply,
    captureDragUndoBaseline: input.captureDragUndoBaseline,
    clearDragUndoBaseline: input.clearDragUndoBaseline,
    commitDragUndoMutation: input.commitDragUndoMutation
  }
}
