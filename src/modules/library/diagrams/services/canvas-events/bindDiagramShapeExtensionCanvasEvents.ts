import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

/** 挂载所有已注册图形扩展的画布交互（扩展自注册 canvasInteractionBinders） */
export function bindDiagramShapeExtensionCanvasEvents(
  ports: DiagramCanvasEventBinderPorts
): () => void {
  const binders = ensureDiagramShapeExtensions().listCanvasInteractionBinders()
  const teardowns = binders.map((binder) => binder(ports))
  return () => {
    for (const teardown of teardowns) teardown()
  }
}
