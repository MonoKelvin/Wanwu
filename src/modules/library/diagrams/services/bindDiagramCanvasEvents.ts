import type LogicFlow from '@logicflow/core'
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import { isGroupFrameType } from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  isDiagramGroupMultiResizing
} from '@modules/library/diagrams/lib/diagramMultiSelectResize'
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
  refreshSnapAlignGuide,
  snapNodesAfterDrag,
  softSnapNodesDuringDrag
} from '@modules/library/diagrams/lib/diagramGridSnap'
import { diagramCanvasBackground, type DiagramCanvasTheme } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  applyEdgeStyleSnapshot,
  applyNodeStyleSnapshot,
  type DiagramEdgeStyleSnapshot,
  type DiagramFormatPainterKind,
  type DiagramNodeStyleSnapshot
} from '@modules/library/diagrams/lib/diagramStyleClipboard'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import { syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import type { DiagramCanvasViewportController } from '@modules/library/diagrams/services/diagramCanvasViewportController'
import type { DiagramEdgeInsertCoordinator } from '@modules/library/diagrams/services/diagramEdgeInsertCoordinator'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import type { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'
import { bindDiagramEdgeEndpointPriority } from '@modules/library/diagrams/services/diagramEdgeEndpointBindings'

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
  scheduleEmitSelection(): void
  scheduleMultiSelectOverlayRefresh(): void
  scheduleOverlayLayout(): void
  refreshMultiSelectResize(): void
  scheduleResizeFollowUp(nodeId: string): void
  countSelectedNodes(): number
  getSelectedNodeIds(): string[]
  getSelectedContentNodeIds(): string[]
  isGroupFrameId(nodeId: string): boolean
  getFormatPainterState(): {
    active: boolean
    kind: DiagramFormatPainterKind
    nodeSnapshot?: DiagramNodeStyleSnapshot
    edgeSnapshot?: DiagramEdgeStyleSnapshot
  } | null
  cancelFormatPainter(): void
  applyDefaultEdgeStyle(edgeId: string): void
  patchBackgroundDom(color: string): void
  onViewportChange(): void
  onFormatPainterNodeApplied(nodeId: string): void
}

export function bindDiagramCanvasEvents(ports: DiagramCanvasEventBinderPorts): () => void {
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

    const painter = ports.getFormatPainterState()
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
    const painter = ports.getFormatPainterState()
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
    ports.selectionBridge.emitSelection()
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
    ports.cancelFormatPainter()
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

  lf.on('node:mouseup', ({ data }) => {
    if (ports.isGroupFrameId(data.id)) {
      ports.groupFrames.scheduleToBottom()
    }
  })

  lf.on('selection:mouseup', () => {
    ports.scheduleMultiSelectOverlayRefresh()
  })

  lf.on('node:dragstart', ({ data }) => {
    const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
    ports.edgeInsert.beginDragForNode(data.id, liveNodeIds)
    ports.groupFrames.prepareFrameDragStart(data.id)
  })

  lf.on('node:drag', ({ data }) => {
    if (isDiagramGroupMultiResizing()) return
    const model = lf.getNodeModelById(data.id)
    if (ports.groupFrames.handleFrameDrag(data.id)) return
    if (model && !isGroupFrameType(model.type)) {
      const inGroup =
        typeof model.properties?.dgGroupId === 'string' && Boolean(model.properties.dgGroupId)
      if (inGroup || ports.countSelectedNodes() >= 2) {
        ports.groupFrames.scheduleSyncDuringDrag(data.id)
      }
      ports.edgeInsert.scheduleHighlightAtNodeCenter(data.id)
    }
    if (ports.countSelectedNodes() === 1 && ports.selectionBridge.getPrimaryNodeId() === data.id) {
      ports.scheduleEmitSelection()
    }
    const canvasSettings = ports.getCanvasSettings()
    if (canvasSettings.snapGrid) {
      const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
      const snapTargets = liveNodeIds.includes(data.id) ? liveNodeIds : [data.id]
      softSnapNodesDuringDrag(lf, snapTargets, true, data.id)
      refreshSnapAlignGuide(lf, data.id, true)
    }
    if (ports.countSelectedNodes() >= 2) {
      ports.refreshMultiSelectResize()
      ports.scheduleOverlayLayout()
    }
  })

  lf.on('selection:drag', () => {
    ports.groupFrames.scheduleSyncDuringDrag()
    ports.refreshMultiSelectResize()
    ports.scheduleOverlayLayout()
  })

  lf.on('selection:drop', () => {
    ports.groupFrames.syncForNodeIds(ports.getSelectedContentNodeIds())
    ports.refreshMultiSelectResize()
    ports.scheduleOverlayLayout()
    ports.selectionBridge.syncFromGraph()
  })

  lf.on('node:drop', ({ data }) => {
    ports.groupFrames.clearDragPosition(data.id)
    ports.edgeInsert.finishDrop(data.id)
    lf.removeNodeSnapLine()
    const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
    const snapTargets = liveNodeIds.includes(data.id) ? liveNodeIds : [data.id]
    snapNodesAfterDrag(lf, snapTargets, ports.getCanvasSettings().snapGrid, data.id)
    const syncIds = (liveNodeIds.includes(data.id) ? liveNodeIds : [data.id]).filter(
      (id) => !ports.isGroupFrameId(id)
    )
    ports.groupFrames.syncForNodeIds(syncIds)
    ports.refreshMultiSelectResize()
    ports.scheduleOverlayLayout()
  })

  for (const evt of [
    'node:add',
    'node:delete',
    'edge:delete',
    'node:drop',
    'node:resize',
    'node:rotate',
    'node:properties-change',
    'edge:adjust',
    'history:change'
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
        if (model) {
          syncNodeTextLayout(model)
          ports.scheduleResizeFollowUp(model.id)
        }
      }
      if (
        (evt === 'node:drop' || evt === 'node:resize' || evt === 'history:change') &&
        !ports.selectionBridge.isMutationSuppressActive()
      ) {
        ports.selectionBridge.syncFromGraph()
        ports.groupFrames.scheduleToBottom()
      }
    })
  }

  lf.on('text:update', () => {
    ports.scheduleGraphChange()
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

  const container = ports.getContainer()
  const teardownEdgeEndpointPriority =
    container &&
    bindDiagramEdgeEndpointPriority(lf, container, {
      onGraphChange: () => ports.scheduleGraphChange(),
      onAdjustDrag: () => {
        ports.refreshMultiSelectResize()
        ports.scheduleOverlayLayout()
      }
    })

  return () => {
    teardownEdgeEndpointPriority?.()
  }
}
