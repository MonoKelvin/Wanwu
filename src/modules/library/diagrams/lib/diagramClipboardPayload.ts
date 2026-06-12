import type LogicFlow from '@logicflow/core'
import {
  collectDiagramGroupContent,
  isGroupFrameModel
} from '@modules/library/diagrams/lib/diagramGroupFrame'

/** 剪贴板 payload 版本，便于后续演进 */
export const DIAGRAM_CLIPBOARD_SCHEMA = 1

export type DiagramClipboardElementKind = 'node' | 'edge'

export type DiagramClipboardCopyMode = 'standalone' | 'group-content' | 'group-frame'

export type DiagramClipboardPropertyContext = {
  elementKind: DiagramClipboardElementKind
  elementType: string
  copyMode: DiagramClipboardCopyMode
}

export type DiagramClipboardPropertySanitizer = (
  properties: Record<string, unknown>,
  ctx: DiagramClipboardPropertyContext
) => Record<string, unknown>

/** 扩展点：模块可注册属性清理/归一化逻辑 */
export const diagramClipboardPropertySanitizers: DiagramClipboardPropertySanitizer[] = []

const CLIPBOARD_MEMBERSHIP_KEYS = ['dgGroupId', 'dgGroupMembers', 'dgGroupEdges'] as const

export interface DiagramClipboardElement {
  localId: string
  kind: DiagramClipboardElementKind
  type: string
  /** LogicFlow 兼容字段（x/y/text/properties/pointsList 等） */
  data: Record<string, unknown>
}

export interface DiagramClipboardGroupBinding {
  localFrameId: string
  memberLocalNodeIds: string[]
  memberLocalEdgeIds: string[]
}

export interface DiagramClipboardPayload {
  schema: typeof DIAGRAM_CLIPBOARD_SCHEMA
  elements: DiagramClipboardElement[]
  groups: DiagramClipboardGroupBinding[]
}

export interface DiagramClipboardCopyPlan {
  groupFrameIds: string[]
  nodeIds: string[]
  edgeIds: string[]
}

export function registerDiagramClipboardPropertySanitizer(
  sanitizer: DiagramClipboardPropertySanitizer
): void {
  diagramClipboardPropertySanitizers.push(sanitizer)
}

export function stripClipboardMembershipProperties(
  properties: Record<string, unknown>
): Record<string, unknown> {
  const props = structuredClone(properties)
  for (const key of CLIPBOARD_MEMBERSHIP_KEYS) delete props[key]
  return props
}

export function sanitizeClipboardProperties(
  properties: Record<string, unknown>,
  ctx: DiagramClipboardPropertyContext
): Record<string, unknown> {
  let props = structuredClone(properties)
  if (ctx.copyMode === 'standalone' || ctx.copyMode === 'group-content') {
    for (const key of CLIPBOARD_MEMBERSHIP_KEYS) delete props[key]
  } else if (ctx.copyMode === 'group-frame') {
    delete props.dgGroupMembers
    delete props.dgGroupEdges
    delete props.dgGroupId
  }
  for (const sanitize of diagramClipboardPropertySanitizers) {
    props = sanitize(props, ctx)
  }
  return props
}

/**
 * 框选/全选组成员但未选中组合框时：若选中了该组的全部成员，则视为复制整组。
 * 仅选部分成员时不触发（粘贴为独立图元、不带组合属性）。
 * 不依赖 dgGroupId，直接比对 collectDiagramGroupContent 的成员列表。
 */
export function detectImplicitGroupFrameCopy(
  lf: LogicFlow,
  nodeIds: readonly string[],
  edgeIds: readonly string[]
): string | null {
  if (!nodeIds.length && !edgeIds.length) return null

  for (const id of nodeIds) {
    if (isGroupFrameModel(lf.getNodeModelById(id))) return null
  }

  const selectedNodes = new Set(nodeIds)
  const selectedEdges = new Set(edgeIds)
  let matchedGroupId: string | null = null

  for (const frame of lf.graphModel.nodes) {
    if (!isGroupFrameModel(frame)) continue
    const groupId = frame.id
    const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, groupId)
    if (!memberNodeIds.length && !memberEdgeIds.length) continue

    if (!memberNodeIds.length && memberEdgeIds.length) {
      if (!memberEdgeIds.every((id) => selectedEdges.has(id))) continue
      if (nodeIds.length) continue
      if (matchedGroupId) return null
      matchedGroupId = groupId
      continue
    }

    if (!memberNodeIds.every((id) => selectedNodes.has(id))) continue

    for (const selectedId of nodeIds) {
      if (!memberNodeIds.includes(selectedId)) return null
    }

    for (const edgeId of edgeIds) {
      const edge = lf.getEdgeModelById(edgeId)
      if (!edge) return null
      const internal =
        memberEdgeIds.includes(edgeId) ||
        (memberNodeIds.includes(edge.sourceNodeId) &&
          memberNodeIds.includes(edge.targetNodeId))
      if (!internal) return null
    }

    if (matchedGroupId && matchedGroupId !== groupId) return null
    matchedGroupId = groupId
  }

  return matchedGroupId
}

function absorbGroupContentIntoPlan(
  lf: LogicFlow,
  groupFrameIds: string[],
  standaloneNodeIds: Set<string>,
  standaloneEdgeIds: Set<string>
): void {
  for (const groupId of groupFrameIds) {
    const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, groupId)
    for (const memberId of memberNodeIds) standaloneNodeIds.delete(memberId)
    for (const edgeId of memberEdgeIds) standaloneEdgeIds.delete(edgeId)
  }
}

function retainInternalStandaloneEdges(
  lf: LogicFlow,
  standaloneNodeIds: Set<string>,
  standaloneEdgeIds: Set<string>
): void {
  for (const edgeId of [...standaloneEdgeIds]) {
    const edge = lf.getEdgeModelById(edgeId)
    if (!edge) {
      standaloneEdgeIds.delete(edgeId)
      continue
    }
    if (
      !standaloneNodeIds.has(edge.sourceNodeId) ||
      !standaloneNodeIds.has(edge.targetNodeId)
    ) {
      standaloneEdgeIds.delete(edgeId)
    }
  }

  for (const edge of lf.graphModel.edges) {
    if (
      standaloneNodeIds.has(edge.sourceNodeId) &&
      standaloneNodeIds.has(edge.targetNodeId)
    ) {
      standaloneEdgeIds.add(edge.id)
    }
  }
}

/** 解析复制目标：显式/隐式整组 vs 独立图元 */
export function resolveDiagramClipboardCopyPlan(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): DiagramClipboardCopyPlan {
  const groupFrameIds: string[] = []
  const standaloneNodeIds = new Set<string>()
  const standaloneEdgeIds = new Set<string>(edgeIds)

  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameModel(model)) {
      if (!groupFrameIds.includes(id)) groupFrameIds.push(id)
      continue
    }
    standaloneNodeIds.add(id)
  }

  const implicitGroupId = detectImplicitGroupFrameCopy(lf, [...standaloneNodeIds], [...standaloneEdgeIds])
  if (implicitGroupId && !groupFrameIds.includes(implicitGroupId)) {
    groupFrameIds.push(implicitGroupId)
  }

  absorbGroupContentIntoPlan(lf, groupFrameIds, standaloneNodeIds, standaloneEdgeIds)
  retainInternalStandaloneEdges(lf, standaloneNodeIds, standaloneEdgeIds)

  return {
    groupFrameIds,
    nodeIds: [...standaloneNodeIds],
    edgeIds: [...standaloneEdgeIds]
  }
}

export function isDiagramClipboardPayloadEmpty(payload: DiagramClipboardPayload | null): boolean {
  return !payload?.elements.length
}

export function collectGroupedMemberLocalIds(payload: DiagramClipboardPayload): Set<string> {
  const ids = new Set<string>()
  for (const group of payload.groups) {
    for (const id of group.memberLocalNodeIds) ids.add(id)
    for (const id of group.memberLocalEdgeIds) ids.add(id)
  }
  return ids
}
