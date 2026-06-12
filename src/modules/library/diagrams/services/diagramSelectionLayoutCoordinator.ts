import type LogicFlow from '@logicflow/core'
import { filterAlignableNodeIds } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import {
  alignNodePositions,
  distributeNodePositions,
  readDiagramNodeBounds,
  type DiagramAlignMode,
  type DiagramDistributeMode,
  type DiagramNodeBounds
} from '@modules/library/diagrams/lib/diagramNodeLayout'
import { applyDiagramNodePositionPatches } from '@modules/library/diagrams/lib/diagramNodePositionApply'
import { collectNudgeTargetNodeIds } from '@modules/library/diagrams/lib/diagramSelectionNudge'
import {
  bringDiagramNodesToFront,
  sendDiagramNodesToBack
} from '@modules/library/diagrams/lib/diagramZIndexOps'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'

export interface DiagramSelectionLayoutCoordinatorPorts {
  getLf(): LogicFlow | null
  getSnapGrid(): boolean
  getSelectedNodeIds(): string[]
  isGroupFrameId(nodeId: string): boolean
  syncGroupFramesForNodeIds(nodeIds: string[]): void
  selectionBridge: DiagramEditorSelectionBridge
  scheduleGraphChange(): void
  refreshMultiSelectOverlay(): void
  scheduleOverlayLayout(): void
}

/**
 * 选区布局：对齐、分布、微移、层级调整。
 */
export class DiagramSelectionLayoutCoordinator {
  constructor(private readonly ports: DiagramSelectionLayoutCoordinatorPorts) {}

  alignNodes(mode: DiagramAlignMode, nodeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const ids = filterAlignableNodeIds(lf, nodeIds?.length ? nodeIds : this.ports.getSelectedNodeIds())
    if (ids.length < 2) return
    const bounds = ids
      .map((id) => readDiagramNodeBounds(lf, id))
      .filter(Boolean) as DiagramNodeBounds[]
    this.applyPositionPatches(alignNodePositions(bounds, mode))
  }

  distributeNodes(mode: DiagramDistributeMode, nodeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const ids = filterAlignableNodeIds(lf, nodeIds?.length ? nodeIds : this.ports.getSelectedNodeIds())
    if (ids.length < 3) return
    const bounds = ids
      .map((id) => readDiagramNodeBounds(lf, id))
      .filter(Boolean) as DiagramNodeBounds[]
    this.applyPositionPatches(distributeNodePositions(bounds, mode))
  }

  nudgeSelection(dx: number, dy: number, nodeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf || (dx === 0 && dy === 0)) return
    const selected = nodeIds?.length ? nodeIds : this.ports.getSelectedNodeIds()
    if (!selected.length) return

    const toMove = collectNudgeTargetNodeIds(lf, selected)
    if (!toMove.length) return

    lf.graphModel.moveNodes(toMove, dx, dy, true)
    this.ports.syncGroupFramesForNodeIds(toMove.filter((id) => !this.ports.isGroupFrameId(id)))
    this.ports.scheduleGraphChange()
    this.ports.selectionBridge.syncFromGraph()
    this.ports.refreshMultiSelectOverlay()
    this.ports.scheduleOverlayLayout()
  }

  bringNodesToFront(nodeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const ids = nodeIds?.length ? nodeIds : this.ports.getSelectedNodeIds()
    bringDiagramNodesToFront(lf, ids)
    this.ports.scheduleGraphChange()
  }

  sendNodesToBack(nodeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const ids = nodeIds?.length ? nodeIds : this.ports.getSelectedNodeIds()
    sendDiagramNodesToBack(lf, ids)
    this.ports.scheduleGraphChange()
  }

  private applyPositionPatches(patches: Array<{ id: string; x: number; y: number }>): void {
    const lf = this.ports.getLf()
    if (!lf || !patches.length) return
    const movedIds = applyDiagramNodePositionPatches(lf, patches, this.ports.getSnapGrid())
    if (!movedIds.length) return
    this.ports.syncGroupFramesForNodeIds(movedIds)
    this.ports.scheduleGraphChange()
    this.ports.selectionBridge.syncFromGraph()
    this.ports.refreshMultiSelectOverlay()
    this.ports.scheduleOverlayLayout()
  }
}
