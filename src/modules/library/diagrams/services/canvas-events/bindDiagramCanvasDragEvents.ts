/**
 * 画布拖拽/缩放事件绑定：磁吸、对齐辅助线、拖拽/缩放 undo 基线捕获与提交。
 * undo 通过 captureDragUndoBaseline → commitDragUndoMutation → FinishDrag 图快照事务。
 */
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import { isGroupFrameType } from '@modules/library/diagrams/lib/diagramGroupFrame'
import { isDiagramGroupMultiResizing } from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import {
  applyNodeSelectForPointer,
  isBoxSubtractKey,
  isModifierSelectionGesture,
  isToggleSelectKey,
  reconcileModifierNodeClick
} from '@modules/library/diagrams/lib/diagramSelectionInteraction'
import type LogicFlow from '@logicflow/core'
import {
  applyDragSnapOnDrop,
  cancelResizeSnapFeedback,
  computeGrabRatiosFromPointer,
  finishResizeAlignSnap,
  scheduleResizeSnapFeedback,
  refreshSnapAlignGuide,
  readAlignmentPointerFromDragEvent,
  softAlignNodesDuringDrag,
  softSnapNodesDuringDrag,
  type AlignmentGrabRatios,
  type AlignmentPointerContext
} from '@modules/library/diagrams/lib/diagramGridSnap'
import {
  bindDiagramSnapBypassListeners,
  isDiagramSnapBypassActive,
  isDiagramSnapBypassEvent
} from '@modules/library/diagrams/lib/diagramSnapBypass'
import {
  isDiagramResizeSessionActive,
  onDiagramResizeSessionEnd,
  onDiagramResizeSessionStart
} from '@modules/library/diagrams/lib/diagramResizeSession'
import {
  cancelScheduledDiagramEdgeTextSync,
  scheduleDiagramEdgeTextSyncForNodes,
  syncDiagramEdgeTextsForNodeIds
} from '@modules/library/diagrams/lib/diagramEdgeTextSync'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'

function resolveSnapTargets(lf: LogicFlow, anchorId: string): string[] {
  const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
  return liveNodeIds.includes(anchorId) ? liveNodeIds : [anchorId]
}

function finishDragSnap(
  ports: DiagramCanvasEventBinderPorts,
  anchorId: string,
  pointer?: AlignmentPointerContext,
  grabRatios?: AlignmentGrabRatios
): void {
  const lf = ports.getLf()
  lf.removeNodeSnapLine()
  const snapTargets = resolveSnapTargets(lf, anchorId).filter((id) => !ports.isGroupFrameId(id))
  if (!snapTargets.length) return
  applyDragSnapOnDrop(lf, snapTargets, {
    snapGrid: ports.getCanvasSettings().snapGrid,
    anchorId,
    pointer: pointer ?? lastDragAlignPointer,
    grabRatios: grabRatios ?? activeGrabRatios
  })
}

let dragSnapApplied = false
let lastDragAlignPointer: AlignmentPointerContext | undefined
let activeGrabRatios: AlignmentGrabRatios | undefined

function finishDragSnapOnce(
  ports: DiagramCanvasEventBinderPorts,
  anchorId: string,
  pointer?: AlignmentPointerContext,
  bypassSnap?: boolean
): void {
  if (bypassSnap) {
    ports.getLf().removeNodeSnapLine()
    return
  }
  if (dragSnapApplied) return
  dragSnapApplied = true
  finishDragSnap(ports, anchorId, pointer, activeGrabRatios)
  requestAnimationFrame(() => {
    dragSnapApplied = false
  })
}

function rememberDragPointer(lf: LogicFlow, e?: MouseEvent | TouchEvent): AlignmentPointerContext | undefined {
  const pointer = readAlignmentPointerFromDragEvent(lf, e)
  if (pointer) lastDragAlignPointer = pointer
  return pointer
}

function applyDragSnapFeedback(
  lf: LogicFlow,
  anchorId: string,
  snapTargets: string[],
  snapGrid: boolean,
  pointer?: AlignmentPointerContext,
  grabRatios?: AlignmentGrabRatios,
  bypassSnap?: boolean
): void {
  if (bypassSnap) {
    lf.removeNodeSnapLine()
    return
  }
  const ratios = grabRatios ?? activeGrabRatios
  softAlignNodesDuringDrag(lf, snapTargets, anchorId, pointer, ratios)
  softSnapNodesDuringDrag(lf, snapTargets, snapGrid, anchorId)
  refreshSnapAlignGuide(lf, anchorId, true, snapTargets, pointer, ratios)
}

function resolveMovingSnapTargets(lf: LogicFlow, anchorId: string, isGroupFrameId: (id: string) => boolean): string[] {
  return resolveSnapTargets(lf, anchorId).filter((id) => !isGroupFrameId(id))
}

/** 拖拽开始时同步选区：未选中图元按点击语义选中，已选中则保留现有多选并推送选区事件 */
function syncSelectionOnNodeDragStart(
  ports: DiagramCanvasEventBinderPorts,
  nodeId: string,
  e?: MouseEvent | TouchEvent
): void {
  if (ports.boxSelect.isInGracePeriod()) return

  const lf = ports.getLf()
  const pointerEvent = e as MouseEvent | PointerEvent | undefined
  ports.boxSelect.clearSnapshots()

  const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
  const alreadySelected = liveNodeIds.includes(nodeId)

  if (!alreadySelected) {
    const snapshot = ports.getClickSelectionSnapshot(pointerEvent)
    if (isToggleSelectKey(pointerEvent) && !isBoxSubtractKey(pointerEvent)) {
      reconcileModifierNodeClick(lf, nodeId, snapshot)
    } else if (!isModifierSelectionGesture(pointerEvent)) {
      applyNodeSelectForPointer(lf, nodeId, pointerEvent, snapshot)
    }
    if (!isModifierSelectionGesture(pointerEvent)) {
      for (const edge of lf.getSelectElements(true).edges) {
        lf.deselectElementById(edge.id)
      }
    }
  }

  ports.selectionBridge.afterSelectionMutation()
}

/** 拖拽、缩放、框选移动、对齐线与松手吸附 */
export function bindDiagramCanvasDragEvents(ports: DiagramCanvasEventBinderPorts): () => void {
  const lf = ports.getLf()
  const teardownBypass = bindDiagramSnapBypassListeners()
  const teardownResizeStart = onDiagramResizeSessionStart(() => {
    ports.captureDragUndoBaseline()
  })
  const teardownResizeEnd = onDiagramResizeSessionEnd(({ nodeId, handleIndex }) => {
    if (isDiagramSnapBypassActive()) {
      cancelResizeSnapFeedback()
      lf.removeNodeSnapLine()
    } else {
      finishResizeAlignSnap(lf, nodeId, handleIndex, ports.getCanvasSettings().snapGrid)
    }
    ports.scheduleResizeFollowUp(nodeId)
    if (ports.countSelectedNodes() === 1) {
      ports.selectionBridge.schedulePublishSelection()
    }
    ports.scheduleOverlayLayout()
  })

  lf.on('node:mouseup', ({ data }) => {
    lf.removeNodeSnapLine()
    if (ports.isGroupFrameId(data.id)) {
      ports.groupFrames.scheduleToBottom()
    }
  })

  lf.on('selection:mouseup', () => {
    ports.scheduleMultiSelectOverlayRefresh()
  })

  lf.on('node:dragstart', ({ data, e }) => {
    ports.captureDragUndoBaseline()
    syncSelectionOnNodeDragStart(ports, data.id, e)
    lf.removeNodeSnapLine()
    lastDragAlignPointer = undefined
    const snapTargets = resolveMovingSnapTargets(lf, data.id, ports.isGroupFrameId)
    activeGrabRatios = computeGrabRatiosFromPointer(
      lf,
      data.id,
      snapTargets.length ? snapTargets : [data.id],
      readAlignmentPointerFromDragEvent(lf, e)
    )
    const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
    ports.edgeInsert.beginDragForNode(data.id, liveNodeIds)
    ports.groupFrames.prepareFrameDragStart(data.id)
  })

  lf.on('node:drag', ({ data, e }) => {
    if (isDiagramGroupMultiResizing()) return
    const model = lf.getNodeModelById(data.id)
    if (ports.groupFrames.handleFrameDrag(data.id)) {
      const frameModel = lf.getNodeModelById(data.id)
      const members = (frameModel?.properties?.dgGroupMembers as string[] | undefined) ?? []
      syncDiagramEdgeTextsForNodeIds(lf, members.length ? members : [data.id])
      return
    }
    if (model && !isGroupFrameType(model.type)) {
      const inGroup =
        typeof model.properties?.dgGroupId === 'string' && Boolean(model.properties.dgGroupId)
      if (inGroup || ports.countSelectedNodes() >= 2) {
        ports.groupFrames.scheduleSyncDuringDrag(data.id)
      }
      ports.edgeInsert.scheduleHighlightAtNodeCenter(data.id)
    }
    if (ports.countSelectedNodes() === 1 && ports.selectionBridge.getPrimaryNodeId() === data.id) {
      ports.selectionBridge.schedulePublishSelection()
    }

    const snapTargets = resolveMovingSnapTargets(lf, data.id, ports.isGroupFrameId)
    const snapGrid = ports.getCanvasSettings().snapGrid
    const pointer = rememberDragPointer(lf, e)
    const bypassSnap = isDiagramSnapBypassEvent(e)
    applyDragSnapFeedback(lf, data.id, snapTargets, snapGrid, pointer, activeGrabRatios, bypassSnap)
    const edgeTextSyncTargets = snapTargets.length ? snapTargets : [data.id]
    syncDiagramEdgeTextsForNodeIds(lf, edgeTextSyncTargets)
    scheduleDiagramEdgeTextSyncForNodes(lf, edgeTextSyncTargets)

    if (ports.countSelectedNodes() >= 2) {
      ports.refreshMultiSelectResize()
      ports.scheduleOverlayLayout()
    }
  })

  lf.on('selection:dragstart', ({ e }) => {
    if (ports.boxSelect.shouldSuppressSelectionDrag()) return
    ports.captureDragUndoBaseline()
    ports.selectionBridge.afterSelectionMutation()
    lf.removeNodeSnapLine()
    const ids = collectOrderedSelectionIds(lf).nodeIds.filter((id) => !ports.isGroupFrameId(id))
    if (!ids.length) return
    activeGrabRatios = computeGrabRatiosFromPointer(
      lf,
      ids[0]!,
      ids,
      readAlignmentPointerFromDragEvent(lf, e)
    )
  })

  lf.on('selection:drag', ({ e }) => {
    if (ports.boxSelect.shouldSuppressSelectionDrag()) return
    ports.groupFrames.scheduleSyncDuringDrag()
    ports.refreshMultiSelectResize()
    ports.scheduleOverlayLayout()
    const ids = collectOrderedSelectionIds(lf).nodeIds.filter((id) => !ports.isGroupFrameId(id))
    if (ids.length) {
      const snapGrid = ports.getCanvasSettings().snapGrid
      const pointer = rememberDragPointer(lf, e)
      const bypassSnap = isDiagramSnapBypassEvent(e)
      applyDragSnapFeedback(lf, ids[0]!, ids, snapGrid, pointer, activeGrabRatios, bypassSnap)
      syncDiagramEdgeTextsForNodeIds(lf, ids)
      scheduleDiagramEdgeTextSyncForNodes(lf, ids)
    }
  })

  lf.on('selection:drop', ({ e }) => {
    if (ports.boxSelect.shouldSuppressSelectionDrag()) {
      ports.clearDragUndoBaseline()
      lf.removeNodeSnapLine()
      return
    }
    ports.groupFrames.syncForNodeIds(ports.getSelectedContentNodeIds())
    ports.refreshMultiSelectResize()
    ports.scheduleOverlayLayout()
    ports.selectionBridge.syncFromGraph()
    const ids = collectOrderedSelectionIds(lf).nodeIds.filter((id) => !ports.isGroupFrameId(id))
    const bypassSnap = isDiagramSnapBypassEvent(e)
    if (ids.length) finishDragSnapOnce(ports, ids[0]!, rememberDragPointer(lf, e), bypassSnap)
    syncDiagramEdgeTextsForNodeIds(lf, ids)
    activeGrabRatios = undefined
    ports.commitDragUndoMutation()
  })

  lf.on('node:drop', ({ data, e }) => {
    ports.groupFrames.clearDragPosition(data.id)
    ports.edgeInsert.finishDrop(data.id)
    finishDragSnapOnce(ports, data.id, rememberDragPointer(lf, e), isDiagramSnapBypassEvent(e))
    activeGrabRatios = undefined
    const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
    const syncIds = (liveNodeIds.includes(data.id) ? liveNodeIds : [data.id]).filter(
      (id) => !ports.isGroupFrameId(id)
    )
    ports.groupFrames.syncForNodeIds(syncIds)
    syncDiagramEdgeTextsForNodeIds(lf, syncIds)
    ports.refreshMultiSelectResize()
    ports.scheduleOverlayLayout()
    ports.commitDragUndoMutation()
  })

  lf.on('node:resize', ({ data, index }) => {
    if (ports.isGroupFrameId(data.id)) return
    if (!isDiagramResizeSessionActive()) return
    if (isDiagramSnapBypassActive()) {
      cancelResizeSnapFeedback()
      lf.removeNodeSnapLine()
      return
    }
    scheduleResizeSnapFeedback(lf, data.id, index, ports.getCanvasSettings().snapGrid)
  })

  return () => {
    cancelScheduledDiagramEdgeTextSync()
    cancelResizeSnapFeedback()
    lf.removeNodeSnapLine()
    teardownResizeStart()
    teardownResizeEnd()
    teardownBypass()
  }
}
