import type LogicFlow from '@logicflow/core'
import {
  collectDiagramGroupContent,
  isGroupFrameModel,
  isGroupFrameType
} from '@modules/library/diagrams/lib/diagramGroupFrame'

export interface DiagramCopySelection {
  nodeIds: string[]
  edgeIds: string[]
}

/**
 * 复制前清理选区：选中组内图元时，移除同组残留的组合框选中（与右键点选行为对齐）。
 */
export function suppressGroupFrameSelectionWhenMembersSelected(lf: LogicFlow): void {
  const nodeIds: string[] = []
  for (const model of lf.graphModel.nodes) {
    if (model.isSelected) nodeIds.push(model.id)
  }
  if (!nodeIds.length) return

  const contentNodeIds = nodeIds.filter((id) => {
    const model = lf.getNodeModelById(id)
    if (!model) return false
    return !isGroupFrameModel(model) && !isGroupFrameType(model.type)
  })
  if (!contentNodeIds.length) return

  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model || (!isGroupFrameModel(model) && !isGroupFrameType(model.type))) continue
    const { memberNodeIds } = collectDiagramGroupContent(lf, id)
    if (contentNodeIds.some((memberId) => memberNodeIds.includes(memberId))) {
      lf.deselectElementById(id)
    }
  }
}

/** 过滤复制输入：去掉与组内图元同时出现的组合框 id */
export function sanitizeDiagramCopySelectionInput(
  lf: LogicFlow,
  nodeIds: readonly string[],
  edgeIds: readonly string[]
): DiagramCopySelection {
  const seen = new Set<string>()
  const rawNodeIds: string[] = []
  for (const id of nodeIds) {
    if (!lf.getNodeModelById(id) || seen.has(id)) continue
    seen.add(id)
    rawNodeIds.push(id)
  }

  const contentNodeIds = rawNodeIds.filter((id) => {
    const model = lf.getNodeModelById(id)
    if (!model) return false
    return !isGroupFrameModel(model) && !isGroupFrameType(model.type)
  })

  const sanitizedNodeIds: string[] = []
  const seenOut = new Set<string>()
  for (const id of rawNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameModel(model) || isGroupFrameType(model.type)) {
      const { memberNodeIds } = collectDiagramGroupContent(lf, id)
      if (contentNodeIds.some((memberId) => memberNodeIds.includes(memberId))) continue
    }
    if (seenOut.has(id)) continue
    seenOut.add(id)
    sanitizedNodeIds.push(id)
  }

  return {
    nodeIds: sanitizedNodeIds,
    edgeIds: [...new Set(edgeIds.filter((id) => Boolean(lf.getEdgeModelById(id))))]
  }
}

/**
 * 从当前选区解析复制目标（快捷键 / 右键菜单唯一入口）。
 */
export function resolveDiagramCopySelectionFromLive(
  lf: LogicFlow,
  live: DiagramCopySelection
): DiagramCopySelection {
  return sanitizeDiagramCopySelectionInput(lf, live.nodeIds, live.edgeIds)
}
