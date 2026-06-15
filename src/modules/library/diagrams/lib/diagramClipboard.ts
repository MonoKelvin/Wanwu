import type LogicFlow from '@logicflow/core'
import {
  collectDiagramGroupContent,
  isGroupFrameModel
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { lfTextToClipboardString } from '@modules/library/diagrams/lib/diagramClipboardText'

export type { DiagramClipboardPayload } from '@modules/library/diagrams/lib/diagramClipboardPayload'
export {
  registerDiagramClipboardPropertySanitizer,
  resolveDiagramClipboardCopyPlan,
  detectImplicitGroupFrameCopy
} from '@modules/library/diagrams/lib/diagramClipboardPayload'
export { lfTextToClipboardString } from '@modules/library/diagrams/lib/diagramClipboardText'

export { resolveDiagramCopySelectionFromLive, sanitizeDiagramCopySelectionInput } from '@modules/library/diagrams/lib/diagramCopySelection'

/**
 * 展开组合框选区为内容图元/连线 id（用于组合/拆组能力判断，非复制专用）。
 */
export function resolveDiagramClipboardTargets(
  lf: LogicFlow,
  options: {
    nodeIds?: string[]
    edgeIds?: string[]
    liveNodeIds: string[]
    liveEdgeIds: string[]
  }
): { nodeIds: string[]; edgeIds: string[] } {
  const rawNodeIds = options.nodeIds?.length ? options.nodeIds : options.liveNodeIds
  const rawEdgeIds = options.edgeIds?.length ? options.edgeIds : options.liveEdgeIds

  const expandedNodeIds: string[] = []
  const expandedEdgeIds = new Set(rawEdgeIds)

  for (const id of rawNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameModel(model)) {
      const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, id)
      for (const memberId of memberNodeIds) expandedNodeIds.push(memberId)
      for (const edgeId of memberEdgeIds) expandedEdgeIds.add(edgeId)
      continue
    }
    expandedNodeIds.push(id)
  }

  const nodeIdSet = new Set<string>()
  for (const id of expandedNodeIds) {
    const model = lf.getNodeModelById(id)
    if (model && !isGroupFrameModel(model)) {
      nodeIdSet.add(id)
    }
  }

  return {
    nodeIds: [...nodeIdSet],
    edgeIds: [...expandedEdgeIds]
  }
}
