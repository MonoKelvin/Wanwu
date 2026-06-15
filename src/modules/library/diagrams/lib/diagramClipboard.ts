import type LogicFlow from '@logicflow/core'
import {
  collectDiagramGroupContent,
  isGroupFrameModel,
  isGroupFrameType
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  resolveDiagramCopySelectionFromLive,
  sanitizeDiagramCopySelectionInput
} from '@modules/library/diagrams/lib/diagramCopySelection'
import {
  buildDiagramClipboardPayload,
  pasteDiagramClipboardPayload,
  type PasteDiagramClipboardOptions
} from '@modules/library/diagrams/lib/diagramClipboardEngine'
import type { DiagramClipboardPayload } from '@modules/library/diagrams/lib/diagramClipboardPayload'
import { lfTextToClipboardString } from '@modules/library/diagrams/lib/diagramClipboardText'

export type { DiagramClipboardPayload } from '@modules/library/diagrams/lib/diagramClipboardPayload'
export {
  registerDiagramClipboardPropertySanitizer,
  resolveDiagramClipboardCopyPlan,
  detectImplicitGroupFrameCopy
} from '@modules/library/diagrams/lib/diagramClipboardPayload'
export { lfTextToClipboardString } from '@modules/library/diagrams/lib/diagramClipboardText'

/** @deprecated 兼容旧类型名，等价于 DiagramClipboardPayload */
export type DiagramClipboardSnapshot = DiagramClipboardPayload

/** @deprecated 兼容旧节点快照类型 */
export interface DiagramClipboardNodeSnapshot {
  id: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  properties?: Record<string, unknown>
}

/** @deprecated 兼容旧连线快照类型 */
export interface DiagramClipboardEdgeSnapshot {
  type: string
  sourceNodeId: string
  targetNodeId: string
  text?: string
  properties?: Record<string, unknown>
}

/**
 * @deprecated 使用 resolveDiagramCopySelectionFromLive / sanitizeDiagramCopySelectionInput
 */
export function resolveDiagramClipboardCopyInput(
  lf: LogicFlow,
  options: { nodeIds: string[]; edgeIds: string[] }
): { nodeIds: string[]; edgeIds: string[] } {
  return sanitizeDiagramCopySelectionInput(lf, options.nodeIds, options.edgeIds)
}

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

export function buildDiagramClipboardSnapshot(
  lf: LogicFlow,
  targets: { nodeIds: string[]; edgeIds: string[] }
): DiagramClipboardPayload | null {
  return buildDiagramClipboardPayload(lf, targets.nodeIds, targets.edgeIds)
}

export type { PasteDiagramClipboardOptions }

/** 将剪贴板快照粘贴到画布，返回新创建的 id */
export function pasteDiagramClipboardSnapshot(
  lf: LogicFlow,
  clip: DiagramClipboardPayload,
  options: PasteDiagramClipboardOptions
): { nodeIds: string[]; edgeIds: string[] } {
  const result = pasteDiagramClipboardPayload(lf, clip, options)
  return { nodeIds: result.nodeIds, edgeIds: result.edgeIds }
}
