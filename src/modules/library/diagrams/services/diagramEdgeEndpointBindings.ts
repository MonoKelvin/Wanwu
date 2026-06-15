import type LogicFlow from '@logicflow/core'
import {
  activateEdgeEndpointPriority,
  finishAdjustPointDrag,
  refreshEdgeEndpointPriorityFromPointer,
  resetEdgeEndpointPriority,
  setAdjustPointDragging,
  suppressNodeAnchorIfEdgePriority
} from '@modules/library/diagrams/lib/diagramEdgeEndpointPriority'

export interface DiagramEdgeEndpointBindingCallbacks {
  onAdjustDrag(): void
  onGraphChange(): void
  captureDragUndoBaseline(): void
  commitDragUndoMutation(): void
  clearDragUndoBaseline(): void
}

/** 连线端点优先级与锚点抑制（悬停 / 调整折点） */
export function bindDiagramEdgeEndpointPriority(
  lf: LogicFlow,
  container: HTMLElement,
  callbacks: DiagramEdgeEndpointBindingCallbacks
): () => void {
  let pointerRaf = 0

  const onEdgeMouseEnter = ({ data }: { data: { id: string } }) => {
    activateEdgeEndpointPriority(lf, data.id, container)
  }

  const onNodeMouseEnter = ({ data }: { data: { id: string } }) => {
    suppressNodeAnchorIfEdgePriority(lf, data.id)
  }

  const onAdjustDragStart = ({ data }: { data?: { edgeData?: { id?: string } } }) => {
    setAdjustPointDragging(true)
    callbacks.captureDragUndoBaseline()
    const edgeId = data?.edgeData?.id
    if (edgeId) {
      activateEdgeEndpointPriority(lf, edgeId, container)
    }
  }

  const onAdjustDrag = () => {
    callbacks.onGraphChange()
    callbacks.onAdjustDrag()
  }

  const onAdjustDragEnd = () => {
    finishAdjustPointDrag(lf, container)
    callbacks.commitDragUndoMutation()
    callbacks.onGraphChange()
  }

  const onPointerMove = (e: PointerEvent) => {
    if (pointerRaf) return
    pointerRaf = requestAnimationFrame(() => {
      pointerRaf = 0
      refreshEdgeEndpointPriorityFromPointer(lf, e.clientX, e.clientY, container)
    })
  }

  lf.on('edge:mouseenter', onEdgeMouseEnter)
  lf.on('node:mouseenter', onNodeMouseEnter)
  lf.on('adjustPoint:dragstart', onAdjustDragStart)
  lf.on('adjustPoint:drag', onAdjustDrag)
  lf.on('adjustPoint:dragend', onAdjustDragEnd)
  container.addEventListener('pointermove', onPointerMove, { passive: true })

  return () => {
    if (pointerRaf) cancelAnimationFrame(pointerRaf)
    lf.off('edge:mouseenter', onEdgeMouseEnter)
    lf.off('node:mouseenter', onNodeMouseEnter)
    lf.off('adjustPoint:dragstart', onAdjustDragStart)
    lf.off('adjustPoint:drag', onAdjustDrag)
    lf.off('adjustPoint:dragend', onAdjustDragEnd)
    container.removeEventListener('pointermove', onPointerMove)
    resetEdgeEndpointPriority(lf, container)
  }
}
