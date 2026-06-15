import type LogicFlow from '@logicflow/core'
import {
  collectDiagramGroupContent,
  collectDiagramGroupContentForCopy,
  isGroupFrameModel,
  isGroupFrameType,
  resolveGroupFrameIdForElement
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
  copyMode: DiagramClipboardCopyMode
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
  delete props.dgGroupStyle
  delete props.dgGroupAlwaysVisible
  return props
}

/** 粘贴用：确保 properties 不含任何组合成员字段 */
export function buildPasteElementProperties(
  properties: unknown,
  options: { standalone: boolean }
): Record<string, unknown> {
  let props = stripClipboardMembershipProperties(cloneModelPropertiesForPaste(properties))
  if (options.standalone) {
    props = stripClipboardMembershipProperties(props)
    for (const key of CLIPBOARD_MEMBERSHIP_KEYS) delete props[key]
    delete props.dgGroupStyle
    delete props.dgGroupAlwaysVisible
  }
  return props
}

function cloneModelPropertiesForPaste(properties: unknown): Record<string, unknown> {
  if (!properties || typeof properties !== 'object') return {}
  try {
    return JSON.parse(JSON.stringify(properties)) as Record<string, unknown>
  } catch {
    try {
      return structuredClone(properties as Record<string, unknown>)
    } catch {
      return {}
    }
  }
}

export function sanitizeClipboardProperties(
  properties: Record<string, unknown>,
  ctx: DiagramClipboardPropertyContext
): Record<string, unknown> {
  let props = structuredClone(properties)
  if (ctx.copyMode === 'standalone' || ctx.copyMode === 'group-content') {
    for (const key of CLIPBOARD_MEMBERSHIP_KEYS) delete props[key]
    delete props.dgGroupStyle
    delete props.dgGroupAlwaysVisible
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
 *
 * 注意：复制粘贴仅在有显式组合框选中时整组复制；此函数供能力判断/测试保留。
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
    const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContentForCopy(lf, groupId)
    for (const memberId of memberNodeIds) standaloneNodeIds.delete(memberId)
    for (const edgeId of memberEdgeIds) standaloneEdgeIds.delete(edgeId)
  }
}

function collectExplicitGroupFrameIds(lf: LogicFlow, nodeIds: readonly string[]): string[] {
  const groupFrameIds: string[] = []
  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameModel(model) || isGroupFrameType(model.type)) {
      if (!groupFrameIds.includes(id)) groupFrameIds.push(id)
    }
  }
  return groupFrameIds
}

/**
 * 判定哪些组合框应触发整组复制。
 * 仅当用户显式选中组合框本身（选区中无该组成员图元）时整组复制。
 * 选中组内图元时（即使组合框 isSelected 残留、或单成员组）一律不整组。
 */
function resolveActiveGroupFrameIdsForCopy(
  lf: LogicFlow,
  nodeIds: readonly string[]
): string[] {
  const candidates = collectExplicitGroupFrameIds(lf, nodeIds)
  if (!candidates.length) return []

  const contentNodeIds = nodeIds.filter((id) => {
    const model = lf.getNodeModelById(id)
    if (!model) return false
    return !isGroupFrameModel(model) && !isGroupFrameType(model.type)
  })

  const active: string[] = []
  for (const groupId of candidates) {
    const { memberNodeIds } = collectDiagramGroupContent(lf, groupId)
    const selectedInGroup = contentNodeIds.filter((id) => memberNodeIds.includes(id))
    if (!selectedInGroup.length) active.push(groupId)
  }
  return active
}

function reclassifyStandaloneGroupFrames(
  lf: LogicFlow,
  groupFrameIds: string[],
  standaloneNodeIds: Set<string>
): void {
  for (const id of [...standaloneNodeIds]) {
    const model = lf.getNodeModelById(id)
    if (!model) {
      standaloneNodeIds.delete(id)
      continue
    }
    if (!isGroupFrameModel(model) && !isGroupFrameType(model.type)) continue
    standaloneNodeIds.delete(id)
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

/**
 * 解析复制目标，两条规则：
 * 1. 选区含组合框 → 每个被选组合框整组复制（框 + 全部成员），同组已选成员去重
 * 2. 未选组合框 → 仅 standalone 图元/连线，不带组合属性
 */
export function resolveDiagramClipboardCopyPlan(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): DiagramClipboardCopyPlan {
  const groupFrameIds = resolveActiveGroupFrameIdsForCopy(lf, nodeIds)
  const selectedGroups = new Set(groupFrameIds)
  const standaloneNodeIds = new Set<string>()
  const standaloneEdgeIds = new Set<string>(edgeIds)

  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameModel(model) || isGroupFrameType(model.type)) continue

    if (selectedGroups.size) {
      const parentGroupId = resolveGroupFrameIdForElement(lf, id, 'node')
      if (parentGroupId && selectedGroups.has(parentGroupId)) continue
    }
    standaloneNodeIds.add(id)
  }

  if (selectedGroups.size) {
    for (const edgeId of [...standaloneEdgeIds]) {
      const parentGroupId = resolveGroupFrameIdForElement(lf, edgeId, 'edge')
      if (parentGroupId && selectedGroups.has(parentGroupId)) {
        standaloneEdgeIds.delete(edgeId)
      }
    }
  }

  reclassifyStandaloneGroupFrames(lf, groupFrameIds, standaloneNodeIds)
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
