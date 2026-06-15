import type LogicFlow from '@logicflow/core'
import { analyzeGroupSelection } from '@modules/library/diagrams/lib/diagramGroupSelection'
import {
  createDiagramGroupFrame,
  deleteDiagramGroupFrameWithContents,
  detachDiagramEdgeFromGroup,
  detachDiagramNodeFromGroup,
  mergeUngroupedIntoDiagramGroup,
  releaseDiagramGroupFrame
} from '@modules/library/diagrams/lib/diagramGroupFrameOps'
import { isGroupFrameModel, collectDiagramGroupContent } from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  askDiagramGroupFrameDeleteConfirm,
  getDiagramGroupFrameDeleteSessionPreference
} from '@modules/library/diagrams/lib/diagramGroupFrameDeleteConfirm'
import { resolveSelectionCapabilities } from '@modules/library/diagrams/domain/selection'
import { readDiagramNodeBounds } from '@modules/library/diagrams/lib/diagramNodeLayout'
import type { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import type { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'

export interface DiagramGroupSelectionCoordinatorPorts {
  getLf(): LogicFlow | null
  isGroupFrameId(nodeId: string): boolean
  resolveClipboardTargets(nodeIds?: string[], edgeIds?: string[]): {
    nodeIds: string[]
    edgeIds: string[]
  }
  selectionBridge: DiagramEditorSelectionBridge
  boxSelect: DiagramBoxSelectCoordinator
  groupFrames: DiagramGroupFrameCoordinator
  cancelPendingSelectionSync(): void
  notifyEditorSelection(): void
  scheduleGraphChange(): void
  refreshMultiSelectOverlay(): void
  scheduleOverlayLayout(): void
}

/**
 * 组合/拆组与成员解绑；组合框显隐仍由 DiagramGroupFrameCoordinator 负责。
 */
export class DiagramGroupSelectionCoordinator {
  constructor(private readonly ports: DiagramGroupSelectionCoordinatorPorts) {}

  canGroupSelection(): boolean {
    const lf = this.ports.getLf()
    if (!lf) return false
    const live = this.ports.selectionBridge.collectLiveSelectedIds()
    return resolveSelectionCapabilities(lf, live.nodeIds, live.edgeIds, {
      resolveClipboardTargets: (ids, eids) =>
        this.ports.resolveClipboardTargets([...ids], [...eids])
    }).canGroup
  }

  canUngroupSelection(): boolean {
    const lf = this.ports.getLf()
    if (!lf) return false
    const { nodeIds, edgeIds } = this.ports.selectionBridge.collectLiveSelectedIds()
    return resolveSelectionCapabilities(lf, nodeIds, edgeIds, {
      resolveClipboardTargets: (ids, eids) =>
        this.ports.resolveClipboardTargets([...ids], [...eids])
    }).canUngroup
  }

  detachNodeFromGroup(nodeId: string): void {
    const lf = this.ports.getLf()
    if (!lf) return
    detachDiagramNodeFromGroup(lf, nodeId)
  }

  detachEdgeFromGroup(edgeId: string): void {
    const lf = this.ports.getLf()
    if (!lf) return
    detachDiagramEdgeFromGroup(lf, edgeId)
  }

  releaseGroupFrame(groupId: string): void {
    const lf = this.ports.getLf()
    if (!lf) return
    releaseDiagramGroupFrame(lf, groupId)
  }

  groupSelection(nodeIds?: string[], edgeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const analysis = analyzeGroupSelection(lf, nodeIds, edgeIds)
    if (analysis.totalElementCount < 2) return

    this.ports.cancelPendingSelectionSync()
    this.ports.selectionBridge.beginMutationSuppress()
    let postGroupNodeIds: string[] = []
    const postGroupEdgeIds: string[] = []
    try {
      if (analysis.primaryGroupId) {
        if (!analysis.ungroupedNodeIds.length && !analysis.ungroupedEdgeIds.length) return
        mergeUngroupedIntoDiagramGroup(
          lf,
          analysis.primaryGroupId,
          analysis.ungroupedNodeIds,
          analysis.ungroupedEdgeIds
        )
        postGroupNodeIds = [analysis.primaryGroupId]
      } else {
        const nodes = analysis.ungroupedNodeIds
        const edges = analysis.ungroupedEdgeIds
        if (nodes.length + edges.length < 2) return
        const groupId = createDiagramGroupFrame(lf, nodes, edges, (id) =>
          readDiagramNodeBounds(lf, id)
        )
        postGroupNodeIds = groupId ? [groupId] : []
      }
      this.ports.boxSelect.clearSnapshots()
      this.ports.selectionBridge.scrubOrphanGroupLinks()
      this.ports.groupFrames.refreshDisplay()
    } finally {
      this.ports.selectionBridge.endMutationSuppress()
      if (postGroupNodeIds.length) {
        this.ports.selectionBridge.schedulePostMutationCommit(postGroupNodeIds, postGroupEdgeIds)
      } else {
        this.ports.notifyEditorSelection()
      }
      this.ports.scheduleGraphChange()
    }
  }

  ungroupSelection(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const { nodeIds, edgeIds } = this.ports.selectionBridge.collectLiveSelectedIds()
    const groupIds = new Set<string>()
    const collectGroupId = (gid: unknown) => {
      if (typeof gid === 'string' && gid) groupIds.add(gid)
    }
    for (const id of nodeIds) {
      const model = lf.getNodeModelById(id)
      if (isGroupFrameModel(model)) {
        groupIds.add(id)
        continue
      }
      collectGroupId(model?.properties?.dgGroupId)
    }
    for (const id of edgeIds) {
      collectGroupId(lf.getEdgeModelById(id)?.properties?.dgGroupId)
    }
    const resolved = this.ports.resolveClipboardTargets(nodeIds, edgeIds)
    for (const id of resolved.nodeIds) {
      collectGroupId(lf.getNodeModelById(id)?.properties?.dgGroupId)
    }
    for (const id of resolved.edgeIds) {
      collectGroupId(lf.getEdgeModelById(id)?.properties?.dgGroupId)
    }
    if (!groupIds.size) return

    const releasedNodeIds: string[] = []
    const releasedEdgeIds: string[] = []
    for (const groupId of groupIds) {
      const model = lf.getNodeModelById(groupId)
      if (!model || !isGroupFrameModel(model)) continue
      const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, groupId)
      releasedNodeIds.push(...memberNodeIds)
      releasedEdgeIds.push(...memberEdgeIds)
    }

    this.ports.cancelPendingSelectionSync()
    this.ports.selectionBridge.beginMutationSuppress()
    try {
      lf.clearSelectElements()
      for (const groupId of groupIds) {
        releaseDiagramGroupFrame(lf, groupId)
      }
      this.ports.selectionBridge.scrubOrphanGroupLinks()
      this.ports.boxSelect.clearSnapshots()
      this.ports.groupFrames.refreshDisplay()
      this.ports.refreshMultiSelectOverlay()
      this.ports.scheduleOverlayLayout()
    } finally {
      this.ports.selectionBridge.endMutationSuppress()
    }

    const uniqueNodeIds = [...new Set(releasedNodeIds)].filter((id) =>
      Boolean(lf.getNodeModelById(id))
    )
    const uniqueEdgeIds = [...new Set(releasedEdgeIds)].filter((id) =>
      Boolean(lf.getEdgeModelById(id))
    )

    if (uniqueNodeIds.length || uniqueEdgeIds.length) {
      this.ports.selectionBridge.schedulePostMutationCommit(uniqueNodeIds, uniqueEdgeIds)
    } else {
      lf.clearSelectElements()
      this.ports.selectionBridge.commitForIds([], [])
    }
    this.ports.scheduleGraphChange()
  }

  async deleteSelection(nodeIds?: string[], edgeIds?: string[]): Promise<void> {
    const lf = this.ports.getLf()
    if (!lf) return
    const targets =
      nodeIds?.length || edgeIds?.length
        ? {
            nodes: (nodeIds ?? []).map((id) => ({ id })),
            edges: (edgeIds ?? []).map((id) => ({ id }))
          }
        : lf.getSelectElements(true)

    const groupFrameIds = targets.nodes
      .map((node) => node.id)
      .filter((id) => isGroupFrameModel(lf.getNodeModelById(id)))

    const groupFrameOnlySelection =
      groupFrameIds.length > 0 &&
      groupFrameIds.length === targets.nodes.length &&
      targets.edges.length === 0

    let deleteGroupContents = false
    if (groupFrameOnlySelection) {
      const sessionPref = getDiagramGroupFrameDeleteSessionPreference()
      if (sessionPref === 'with-contents') {
        deleteGroupContents = true
      } else if (sessionPref === 'frame-only') {
        deleteGroupContents = false
      } else {
        const choice = await askDiagramGroupFrameDeleteConfirm(groupFrameIds.length)
        if (choice === 'cancel') return
        deleteGroupContents = choice === 'with-contents'
      }
    }

    const deletedNodeIds = new Set<string>()
    const deletedEdgeIds = new Set<string>()

    for (const node of targets.nodes) {
      if (deletedNodeIds.has(node.id)) continue
      const model = lf.getNodeModelById(node.id)
      if (isGroupFrameModel(model)) {
        if (deleteGroupContents) {
          const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, node.id)
          deleteDiagramGroupFrameWithContents(lf, node.id)
          for (const edgeId of memberEdgeIds) deletedEdgeIds.add(edgeId)
          for (const memberId of memberNodeIds) deletedNodeIds.add(memberId)
        } else {
          releaseDiagramGroupFrame(lf, node.id)
        }
        continue
      }
      detachDiagramNodeFromGroup(lf, node.id)
      lf.deleteNode(node.id)
      deletedNodeIds.add(node.id)
    }
    for (const edge of targets.edges) {
      if (deletedEdgeIds.has(edge.id)) continue
      detachDiagramEdgeFromGroup(lf, edge.id)
      lf.deleteEdge(edge.id)
      deletedEdgeIds.add(edge.id)
    }
    this.ports.selectionBridge.setPrimarySelection(null, null)
    this.ports.groupFrames.refreshDisplay()
    this.ports.selectionBridge.publishSelection()
    this.ports.scheduleGraphChange()
  }
}
