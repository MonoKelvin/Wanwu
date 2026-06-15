import type BaseEdgeModel from '@logicflow/core/lib/model/edge/BaseEdgeModel'
import { diagramCanvasBackground } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { syncDiagramEdgeTextById, syncDiagramEdgeTextPosition, syncDiagramEdgeTextsForNodeIds } from '@modules/library/diagrams/lib/diagramEdgeTextSync'
import { syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'
import { isDiagramResizeSessionActive } from '@modules/library/diagrams/lib/diagramResizeSession'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

/** 图变更、缩放、文本更新等生命周期事件 */
export function bindDiagramCanvasLifecycleEvents(ports: DiagramCanvasEventBinderPorts): void {
  const lf = ports.getLf()

  for (const evt of [
    'node:add',
    'node:delete',
    'edge:delete',
    'node:drop',
    'node:resize',
    'node:rotate',
    'node:properties-change',
    'edge:adjust'
  ] as const) {
    lf.on(evt, (arg: unknown) => {
      ports.scheduleGraphChange()
      if (evt === 'node:drop') {
        for (const id of ports.getSelectedNodeIds()) {
          const model = lf.getNodeModelById(id)
          if (model) syncNodeTextLayout(model)
        }
      }
      if (evt === 'node:resize') {
        const payload = arg as { data?: { id: string }; model?: { id: string } } | undefined
        const nodeId = payload?.data?.id ?? payload?.model?.id
        const model = nodeId ? lf.getNodeModelById(nodeId) : undefined
        if (model && !isDiagramResizeSessionActive()) {
          syncNodeTextLayout(model)
          ports.scheduleResizeFollowUp(model.id)
        }
        if (nodeId) syncDiagramEdgeTextsForNodeIds(lf, [nodeId])
      }
      if (evt === 'edge:adjust') {
        const payload = arg as { data?: { id?: string } } | undefined
        const edgeId = payload?.data?.id
        if (edgeId) syncDiagramEdgeTextById(lf, edgeId)
      }
      if (
        (evt === 'node:drop' || evt === 'node:resize') &&
        !ports.selectionBridge.isMutationSuppressActive() &&
        !(evt === 'node:resize' && isDiagramResizeSessionActive())
      ) {
        ports.selectionBridge.syncFromGraph()
        ports.groupFrames.scheduleToBottom()
      }
    })
  }

  lf.on('text:update', ({ model }) => {
    ports.scheduleGraphChange()
    if (model && typeof model === 'object' && model !== null && 'sourceNodeId' in model) {
      syncDiagramEdgeTextPosition(model as BaseEdgeModel)
    }
  })

  lf.on('graph:transform', () => {
    ports.onViewportChange()
    const bg =
      ports.getCanvasSettings().backgroundColor ||
      diagramCanvasBackground(ports.getResolvedTheme())
    ports.patchBackgroundDom(bg)
    if (ports.countSelectedNodes() >= 2) {
      ports.refreshMultiSelectResize()
      ports.scheduleOverlayLayout()
    }
  })
}
