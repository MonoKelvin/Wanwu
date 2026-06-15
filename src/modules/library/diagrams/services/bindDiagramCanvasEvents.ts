import { bindDiagramEdgeEndpointPriority } from '@modules/library/diagrams/services/diagramEdgeEndpointBindings'
import { bindDiagramCanvasDragEvents } from '@modules/library/diagrams/services/canvas-events/bindDiagramCanvasDragEvents'
import { bindDiagramCanvasLifecycleEvents } from '@modules/library/diagrams/services/canvas-events/bindDiagramCanvasLifecycleEvents'
import { bindDiagramCanvasPointerEvents } from '@modules/library/diagrams/services/canvas-events/bindDiagramCanvasPointerEvents'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

export type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

/** 注册 LogicFlow 画布事件（按指针/拖拽/生命周期分组） */
export function bindDiagramCanvasEvents(ports: DiagramCanvasEventBinderPorts): () => void {
  bindDiagramCanvasPointerEvents(ports)
  const teardownDrag = bindDiagramCanvasDragEvents(ports)
  bindDiagramCanvasLifecycleEvents(ports)

  const container = ports.getContainer()
  const lf = ports.getLf()
  const teardownEdgeEndpointPriority =
    container &&
    bindDiagramEdgeEndpointPriority(lf, container, {
      onGraphChange: () => ports.scheduleGraphChange(),
      onAdjustDrag: () => {
        ports.refreshMultiSelectResize()
        ports.scheduleOverlayLayout()
      },
      captureDragUndoBaseline: () => ports.captureDragUndoBaseline(),
      commitDragUndoMutation: () => ports.commitDragUndoMutation(),
      clearDragUndoBaseline: () => ports.clearDragUndoBaseline()
    })

  return () => {
    teardownDrag()
    teardownEdgeEndpointPriority?.()
  }
}
