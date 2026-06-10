import type LogicFlow from '@logicflow/core'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'
import type {
  DiagramEditorSelection,
  DiagramNodeShapeExtensionView
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

/** 过滤已删除或无效的图元/连线 id，保持原有顺序 */
export function sanitizeSelectionIds(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): { nodeIds: string[]; edgeIds: string[] } {
  const nodes = nodeIds.filter((id) => Boolean(lf.getNodeModelById(id)))
  const edges = edgeIds.filter((id) => Boolean(lf.getEdgeModelById(id)))
  return { nodeIds: nodes, edgeIds: edges }
}

/** 属性面板主图元：优先内容图元，其次组合框 */
export function resolvePrimaryNodeId(lf: LogicFlow, nodeIds: string[]): string | null {
  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (model && model.type !== DIAGRAM_GROUP_FRAME_TYPE) return id
  }
  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) return id
  }
  return null
}

/** 从 LogicFlow 选区中移除无效 id */
export function pruneStaleSelectionInGraph(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): void {
  for (const id of nodeIds) {
    if (!lf.getNodeModelById(id)) lf.deselectElementById(id)
  }
  for (const id of edgeIds) {
    if (!lf.getEdgeModelById(id)) lf.deselectElementById(id)
  }
}

/** 基于 id 列表统计选区数量（与属性面板一致，不依赖 overlay 缓存） */
export function deriveSelectionCounts(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): { selectedNodeCount: number; selectedEdgeCount: number } {
  const alignable = nodeIds.filter((id) => {
    const model = lf.getNodeModelById(id)
    return model && model.type !== DIAGRAM_GROUP_FRAME_TYPE
  })
  const hasGroupFrame = nodeIds.some(
    (id) => lf.getNodeModelById(id)?.type === DIAGRAM_GROUP_FRAME_TYPE
  )
  const selectedNodeCount = alignable.length > 0 ? alignable.length : hasGroupFrame ? 1 : 0
  return { selectedNodeCount, selectedEdgeCount: edgeIds.length }
}

export function effectiveNodeCount(selection: DiagramEditorSelection): number {
  return Math.max(selection.selectedNodeCount, selection.selectedNodeIds.length)
}

export function effectiveEdgeCount(selection: DiagramEditorSelection): number {
  return Math.max(selection.selectedEdgeCount, selection.selectedEdgeIds.length)
}

export function shapeExtensionDigest(
  ext: DiagramNodeShapeExtensionView | null | undefined
): string {
  if (!ext) return ''
  try {
    return `${ext.kind}:${JSON.stringify(ext.data)}`
  } catch {
    return ext.kind
  }
}

/** 供 Vue :key 与变更检测使用的轻量指纹 */
export function selectionFingerprint(selection: DiagramEditorSelection): string {
  const node = selection.node
  return [
    selection.kind,
    selection.selectedNodeCount,
    selection.selectedEdgeCount,
    selection.selectedNodeIds.join(','),
    selection.selectedEdgeIds.join(','),
    selection.edge?.id ?? '',
    node?.id ?? '',
    node?.type ?? '',
    node?.groupId ?? '',
    node?.width ?? '',
    node?.height ?? '',
    node?.fill ?? '',
    node?.stroke ?? '',
    shapeExtensionDigest(node?.shapeExtension),
    selection.canUngroup ? 1 : 0,
    selection.canGroup ? 1 : 0,
    selection.mixedNodeFields.join(',')
  ].join('|')
}

export type DiagramBoxSelectRestoreContext = {
  liveNodeIds: string[]
  liveEdgeIds: string[]
  boxSelectAppliedResult: { nodeIds: readonly string[]; edgeIds: readonly string[] } | null
  lastBoxSelectNodeIds: readonly string[]
  suppressPostBoxSelectClickUntil: number
  filterAlignableNodeIds: (ids: string[]) => string[]
}

/**
 * 框选后 LF click 可能收成单选；在读取选区前按快照恢复（不恢复普通点击清空）。
 * @returns 是否执行了恢复
 */
export function reconcileCollapsedBoxSelection(
  lf: LogicFlow,
  ctx: DiagramBoxSelectRestoreContext
): boolean {
  const liveCount = ctx.liveNodeIds.length + ctx.liveEdgeIds.length

  if (ctx.boxSelectAppliedResult) {
    const snap = ctx.boxSelectAppliedResult
    const snapCount = snap.nodeIds.length + snap.edgeIds.length
    if (liveCount < snapCount) {
      lf.clearSelectElements()
      for (const id of snap.nodeIds) lf.selectElementById(id, true)
      for (const id of snap.edgeIds) lf.selectElementById(id, true)
      return true
    }
    return false
  }

  if (
    performance.now() < ctx.suppressPostBoxSelectClickUntil &&
    ctx.lastBoxSelectNodeIds.length >= 2
  ) {
    const alignable = ctx.filterAlignableNodeIds(ctx.liveNodeIds)
    if (alignable.length < ctx.lastBoxSelectNodeIds.length) {
      lf.clearSelectElements()
      for (const id of ctx.lastBoxSelectNodeIds) {
        lf.selectElementById(id, true)
      }
      return true
    }
  }

  return false
}
