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
import {
  applyEdgeStyleSnapshot,
  applyNodeStyleSnapshot
} from '@modules/library/diagrams/lib/diagramStyleClipboard'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

/** 点击/空白/连线选中与格式刷应用 */
export function bindDiagramCanvasPointerEvents(ports: DiagramCanvasEventBinderPorts): void {
  const lf = ports.getLf()

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
    if (painter?.active && painter.kind === 'node') {
      applyNodeStyleSnapshot(lf, data.id, painter.nodeSnapshot!)
      ports.onFormatPainterNodeApplied(data.id)
      ports.scheduleGraphChange()
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
    if (painter?.active && painter.kind === 'edge') {
      applyEdgeStyleSnapshot(lf, data.id, painter.edgeSnapshot!)
      ports.scheduleGraphChange()
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
    ports.applyDefaultEdgeStyle(data.id)
    ports.selectionBridge.setPrimarySelection(null, data.id)
    ports.scheduleGraphChange()
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
