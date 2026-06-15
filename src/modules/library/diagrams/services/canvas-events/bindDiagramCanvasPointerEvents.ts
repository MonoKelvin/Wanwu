import {
  applyNodeSelectForPointer,
  isBoxSubtractKey,
  isModifierSelectionGesture,
  isToggleSelectKey,
  reconcileModifierNodeClick
} from '@modules/library/diagrams/lib/diagramSelectionInteraction'
import {
  activateEdgeEndpointPriority,
  resetEdgeEndpointPriority
} from '@modules/library/diagrams/lib/diagramEdgeEndpointPriority'
import { applyGroupFrameAlwaysVisibleForConnectedNodes } from '@modules/library/diagrams/lib/diagramGroupFrame'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

/** 点击/空白/连线选中与格式刷应用 */
export function bindDiagramCanvasPointerEvents(ports: DiagramCanvasEventBinderPorts): void {
  const lf = ports.getLf()
  let edgeAnchorDrawActive = false

  lf.on('anchor:dragstart', () => {
    ports.captureDragUndoBaseline()
    edgeAnchorDrawActive = true
  })

  lf.on('anchor:dragend', () => {
    if (edgeAnchorDrawActive) {
      ports.clearDragUndoBaseline()
      edgeAnchorDrawActive = false
    }
  })

  lf.on('node:click', ({ data, e }) => {
    if (ports.boxSelect.isInGracePeriod()) {
      ports.boxSelect.handleGracePeriodInteraction()
      return
    }

    ports.boxSelect.clearSnapshots()
    if (!isModifierSelectionGesture(e)) {
      ports.boxSelect.clearLastBoxSelectOnPlainClick()
    }
    if (isToggleSelectKey(e) && !isBoxSubtractKey(e)) {
      reconcileModifierNodeClick(lf, data.id, ports.getClickSelectionSnapshot(e))
    } else if (!isModifierSelectionGesture(e)) {
      applyNodeSelectForPointer(lf, data.id, e, ports.getClickSelectionSnapshot(e))
    }
    if (!isModifierSelectionGesture(e)) {
      for (const edge of lf.getSelectElements(true).edges) {
        lf.deselectElementById(edge.id)
      }
    }

    const painter = ports.formatPainter.getState()
    if (painter?.active && painter.kind === 'node' && painter.nodeSnapshot) {
      ports.requestFormatPainterApply({
        targetId: data.id,
        kind: 'node',
        nodeSnapshot: painter.nodeSnapshot
      })
      ports.onFormatPainterNodeApplied(data.id)
    }
    ports.selectionBridge.afterSelectionMutation()
  })

  lf.on('edge:click', ({ data, e }) => {
    if (ports.boxSelect.isInGracePeriod()) {
      ports.boxSelect.handleGracePeriodInteraction()
      return
    }
    ports.boxSelect.clearSnapshots()
    const painter = ports.formatPainter.getState()
    if (painter?.active && painter.kind === 'edge' && painter.edgeSnapshot) {
      ports.requestFormatPainterApply({
        targetId: data.id,
        kind: 'edge',
        edgeSnapshot: painter.edgeSnapshot
      })
    }
    const append = Boolean(e?.ctrlKey || e?.metaKey || e?.shiftKey)
    if (!append) {
      for (const node of lf.getSelectElements(true).nodes) {
        lf.deselectElementById(node.id)
      }
    }
    if (append && ports.selectionBridge.getLastSelectedEdgeIds().includes(data.id)) {
      lf.deselectElementById(data.id)
    }
    activateEdgeEndpointPriority(lf, data.id, ports.getContainer())
    ports.selectionBridge.afterUserSelectionChange()
  })

  lf.on('edge:add', ({ data }) => {
    edgeAnchorDrawActive = false
    ports.applyDefaultEdgeStyle(data.id)
    const edge = lf.getEdgeModelById(data.id)
    if (
      edge &&
      applyGroupFrameAlwaysVisibleForConnectedNodes(lf, edge.sourceNodeId, edge.targetNodeId)
    ) {
      ports.groupFrames.refreshDisplay()
    }
    ports.selectionBridge.setPrimarySelection(null, data.id)
    ports.commitDragUndoMutation()
    ports.selectionBridge.publishSelection()
  })

  lf.on('edge:delete', () => {
    resetEdgeEndpointPriority(lf, ports.getContainer())
  })

  lf.on('blank:click', ({ e }) => {
    if (ports.viewport.isMiddlePanning()) return
    const button = (e as MouseEvent | PointerEvent | undefined)?.button
    if (button !== undefined && button !== 0) return
    if (ports.boxSelect.isInGracePeriod()) {
      ports.boxSelect.handleGracePeriodInteraction()
      ports.boxSelect.cleanupActive()
      return
    }
    if (isModifierSelectionGesture(e)) return
    ports.formatPainter.cancel()
    ports.boxSelect.clearSnapshots()
    lf.clearSelectElements()
    lf.removeNodeSnapLine()
    ports.boxSelect.cleanupActive()
    ports.boxSelect.scheduleDismissRubberBand()
    resetEdgeEndpointPriority(lf, ports.getContainer())
    ports.selectionBridge.afterUserSelectionChange()
  })

  lf.on('blank:mousedown', ({ e }) => {
    ports.boxSelect.armOverlay(e)
  })

  lf.on('selection:mousedown', ({ e }) => {
    ports.boxSelect.armOverlay(e)
  })

  lf.on('selection:selected', (payload: {
    leftTopPoint: [number, number]
    rightBottomPoint: [number, number]
  }) => {
    ports.boxSelect.finalizeFromLfSelection(payload.leftTopPoint, payload.rightBottomPoint)
  })
}
