import type LogicFlow from '@logicflow/core'
import {
  DIAGRAM_GROUP_FRAME_TYPE,
  clearElementGroupMembership,
  collectDiagramGroupContent,
  syncDiagramGroupMembershipFromFrames
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { ensureGroupFrameAtBottom, syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import {
  createDiagramGroupFrame,
  mergeUngroupedIntoDiagramGroup
} from '@modules/library/diagrams/lib/diagramGroupFrameOps'
import { selectionBoundsCenter, readDiagramNodeBounds } from '@modules/library/diagrams/lib/diagramNodeLayout'
import { snapNodesAfterDrag } from '@modules/library/diagrams/lib/diagramGridSnap'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import {
  applyEdgeProperties,
  readEdgeProperties
} from '@modules/library/diagrams/lib/diagramStyleBridge'
import { DIAGRAM_CLIPBOARD_DEFAULT_OFFSET } from '@modules/library/diagrams/lib/diagramEditorConstants'
import {
  DIAGRAM_CLIPBOARD_SCHEMA,
  type DiagramClipboardCopyMode,
  type DiagramClipboardElement,
  type DiagramClipboardGroupBinding,
  type DiagramClipboardPayload,
  collectGroupedMemberLocalIds,
  resolveDiagramClipboardCopyPlan,
  sanitizeClipboardProperties,
  stripClipboardMembershipProperties
} from '@modules/library/diagrams/lib/diagramClipboardPayload'
import { lfTextToClipboardString } from '@modules/library/diagrams/lib/diagramClipboardText'

function serializeNode(
  model: NonNullable<ReturnType<LogicFlow['getNodeModelById']>>,
  copyMode: DiagramClipboardCopyMode
): DiagramClipboardElement {
  return {
    localId: model.id,
    kind: 'node',
    type: String(model.type),
    data: {
      x: model.x,
      y: model.y,
      width: model.width,
      height: model.height,
      text: lfTextToClipboardString(model.text),
      properties: sanitizeClipboardProperties((model.properties ?? {}) as Record<string, unknown>, {
        elementKind: 'node',
        elementType: String(model.type),
        copyMode
      })
    }
  }
}

function serializeEdge(
  model: NonNullable<ReturnType<LogicFlow['getEdgeModelById']>>,
  copyMode: DiagramClipboardCopyMode
): DiagramClipboardElement {
  const data: Record<string, unknown> = {
    sourceNodeId: model.sourceNodeId,
    targetNodeId: model.targetNodeId,
    text: lfTextToClipboardString(model.text),
    properties: sanitizeClipboardProperties((model.properties ?? {}) as Record<string, unknown>, {
      elementKind: 'edge',
      elementType: String(model.type),
      copyMode
    })
  }
  if (Array.isArray(model.pointsList) && model.pointsList.length) {
    data.pointsList = structuredClone(model.pointsList)
  }
  if (model.startPoint) data.startPoint = { ...model.startPoint }
  if (model.endPoint) data.endPoint = { ...model.endPoint }
  return {
    localId: model.id,
    kind: 'edge',
    type: String(model.type),
    data
  }
}

function upsertElement(
  map: Map<string, DiagramClipboardElement>,
  element: DiagramClipboardElement
): void {
  map.set(element.localId, element)
}

export function buildDiagramClipboardPayload(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): DiagramClipboardPayload | null {
  syncDiagramGroupMembershipFromFrames(lf)
  const plan = resolveDiagramClipboardCopyPlan(lf, nodeIds, edgeIds)
  if (!plan.groupFrameIds.length && !plan.nodeIds.length && !plan.edgeIds.length) {
    return null
  }

  const elementMap = new Map<string, DiagramClipboardElement>()
  const groups: DiagramClipboardGroupBinding[] = []
  const ownedLocalIds = new Set<string>()

  for (const groupId of plan.groupFrameIds) {
    const group = lf.getNodeModelById(groupId)
    if (!group) continue

    const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, groupId)
    upsertElement(elementMap, serializeNode(group, 'group-frame'))
    ownedLocalIds.add(groupId)

    const memberSet = new Set(memberNodeIds)
    const allGroupEdgeIds = new Set(memberEdgeIds)
    for (const edge of lf.graphModel.edges) {
      if (memberSet.has(edge.sourceNodeId) && memberSet.has(edge.targetNodeId)) {
        allGroupEdgeIds.add(edge.id)
      }
    }

    for (const memberId of memberNodeIds) {
      const member = lf.getNodeModelById(memberId)
      if (!member) continue
      upsertElement(elementMap, serializeNode(member, 'group-content'))
      ownedLocalIds.add(memberId)
    }
    for (const edgeId of allGroupEdgeIds) {
      const edge = lf.getEdgeModelById(edgeId)
      if (!edge) continue
      upsertElement(elementMap, serializeEdge(edge, 'group-content'))
      ownedLocalIds.add(edgeId)
    }

    groups.push({
      localFrameId: groupId,
      memberLocalNodeIds: memberNodeIds,
      memberLocalEdgeIds: [...allGroupEdgeIds]
    })
  }

  for (const nodeId of plan.nodeIds) {
    if (ownedLocalIds.has(nodeId)) continue
    const model = lf.getNodeModelById(nodeId)
    if (model) upsertElement(elementMap, serializeNode(model, 'standalone'))
  }

  for (const edgeId of plan.edgeIds) {
    if (ownedLocalIds.has(edgeId)) continue
    const model = lf.getEdgeModelById(edgeId)
    if (model) upsertElement(elementMap, serializeEdge(model, 'standalone'))
  }

  return {
    schema: DIAGRAM_CLIPBOARD_SCHEMA,
    elements: [...elementMap.values()],
    groups
  }
}

export interface PasteDiagramClipboardOptions {
  clientX?: number
  clientY?: number
  fixedOffsetX?: number
  fixedOffsetY?: number
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
  getContainer(): HTMLElement | null
  snapGrid: boolean
  select(nodeIds: string[], edgeIds?: string[]): void
}

function newElementId(type: string, stamp: number, seq: number): string {
  return `${type}_${stamp}_${seq}_${Math.random().toString(36).slice(2, 6)}`
}

function pasteOffsetForPayload(
  payload: DiagramClipboardPayload,
  deferredFrameLocalIds: Set<string>,
  options: PasteDiagramClipboardOptions
): { offsetX: number; offsetY: number } {
  let offsetX: number = DIAGRAM_CLIPBOARD_DEFAULT_OFFSET.x
  let offsetY: number = DIAGRAM_CLIPBOARD_DEFAULT_OFFSET.y

  const pasteNodes = payload.elements.filter(
    (el) => el.kind === 'node' && !deferredFrameLocalIds.has(el.localId)
  )
  if (!pasteNodes.length) return { offsetX, offsetY }

  const { x: centerX, y: centerY } = selectionBoundsCenter(
    pasteNodes.map((el) => ({
      x: el.data.x as number,
      y: el.data.y as number,
      width: el.data.width as number | undefined,
      height: el.data.height as number | undefined
    }))
  )

  if (options.fixedOffsetX != null && options.fixedOffsetY != null) {
    return { offsetX: options.fixedOffsetX, offsetY: options.fixedOffsetY }
  }
  if (options.clientX != null && options.clientY != null) {
    const { x: cx, y: cy } = options.clientToCanvas(options.clientX, options.clientY)
    return { offsetX: cx - centerX, offsetY: cy - centerY }
  }
  const container = options.getContainer()
  if (container) {
    const rect = container.getBoundingClientRect()
    const { x: cx, y: cy } = options.clientToCanvas(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    )
    return { offsetX: cx - centerX, offsetY: cy - centerY }
  }
  return { offsetX, offsetY }
}

function offsetPolylinePoints(
  points: Array<{ x: number; y: number }> | undefined,
  offsetX: number,
  offsetY: number
): Array<{ x: number; y: number }> | undefined {
  if (!points?.length) return undefined
  return points.map((pt) => ({ x: pt.x + offsetX, y: pt.y + offsetY }))
}

function pasteNodeElement(
  lf: LogicFlow,
  element: DiagramClipboardElement,
  offsetX: number,
  offsetY: number,
  stamp: number,
  seq: number,
  idMap: Map<string, string>,
  createdNodeIds: string[]
): string {
  const newId = newElementId(element.type, stamp, seq)
  idMap.set(element.localId, newId)
  createdNodeIds.push(newId)

  lf.addNode({
    id: newId,
    type: element.type,
    x: (element.data.x as number) + offsetX,
    y: (element.data.y as number) + offsetY,
    text: element.data.text as string | undefined,
    properties: stripClipboardMembershipProperties(
      (element.data.properties ?? {}) as Record<string, unknown>
    )
  })
  clearElementGroupMembership(lf, newId)

  const model = lf.getNodeModelById(newId)
  if (model && (element.data.width != null || element.data.height != null)) {
    applyNodeDimensions(
      model as Parameters<typeof applyNodeDimensions>[0],
      (element.data.width as number | undefined) ?? Math.round(model.width),
      (element.data.height as number | undefined) ?? Math.round(model.height)
    )
  }
  return newId
}

function pasteEdgeElement(
  lf: LogicFlow,
  element: DiagramClipboardElement,
  offsetX: number,
  offsetY: number,
  stamp: number,
  seq: number,
  idMap: Map<string, string>,
  createdEdgeIds: string[]
): string | null {
  const sourceNodeId = idMap.get(element.data.sourceNodeId as string)
  const targetNodeId = idMap.get(element.data.targetNodeId as string)
  if (!sourceNodeId || !targetNodeId) return null
  if (!lf.getNodeModelById(sourceNodeId) || !lf.getNodeModelById(targetNodeId)) return null

  const newId = newElementId(element.type, stamp, seq)
  idMap.set(element.localId, newId)
  createdEdgeIds.push(newId)

  const pointsList = offsetPolylinePoints(
    element.data.pointsList as Array<{ x: number; y: number }> | undefined,
    offsetX,
    offsetY
  )
  const startPoint = element.data.startPoint as { x: number; y: number } | undefined
  const endPoint = element.data.endPoint as { x: number; y: number } | undefined

  lf.addEdge({
    id: newId,
    type: element.type,
    sourceNodeId,
    targetNodeId,
    text: element.data.text as string | undefined,
    properties: stripClipboardMembershipProperties(
      (element.data.properties ?? {}) as Record<string, unknown>
    ),
    ...(pointsList ? { pointsList } : {}),
    ...(startPoint
      ? { startPoint: { x: startPoint.x + offsetX, y: startPoint.y + offsetY } }
      : {}),
    ...(endPoint ? { endPoint: { x: endPoint.x + offsetX, y: endPoint.y + offsetY } } : {})
  })
  clearElementGroupMembership(lf, newId)

  const edgeProps = readEdgeProperties(lf, newId)
  if (edgeProps) applyEdgeProperties(lf, edgeProps)
  return newId
}

function pasteGroupBinding(
  lf: LogicFlow,
  binding: DiagramClipboardGroupBinding,
  frameElement: DiagramClipboardElement,
  idMap: Map<string, string>,
  offsetX: number,
  offsetY: number,
  stamp: number,
  seq: number
): string | null {
  const memberNodeIds = binding.memberLocalNodeIds
    .map((localId) => idMap.get(localId))
    .filter((id): id is string => Boolean(id))
  const memberEdgeIds = binding.memberLocalEdgeIds
    .map((localId) => idMap.get(localId))
    .filter((id): id is string => Boolean(id))

  if (!memberNodeIds.length && !memberEdgeIds.length) return null

  const createdGroupId = createDiagramGroupFrame(
    lf,
    memberNodeIds,
    memberEdgeIds,
    (id) => readDiagramNodeBounds(lf, id)
  )

  if (createdGroupId) {
    idMap.set(binding.localFrameId, createdGroupId)
    const frameProps = stripClipboardMembershipProperties(
      (frameElement.data.properties ?? {}) as Record<string, unknown>
    )
    if (Object.keys(frameProps).length) {
      lf.setProperties(createdGroupId, frameProps)
    }
    const groupModel = lf.getNodeModelById(createdGroupId)
    if (groupModel) {
      if (frameElement.data.width != null) {
        groupModel.width = frameElement.data.width as number
      }
      if (frameElement.data.height != null) {
        groupModel.height = frameElement.data.height as number
      }
      const targetX = (frameElement.data.x as number) + offsetX
      const targetY = (frameElement.data.y as number) + offsetY
      lf.graphModel.moveNode(
        createdGroupId,
        targetX - groupModel.x,
        targetY - groupModel.y,
        true
      )
    }
    ensureGroupFrameAtBottom(lf, createdGroupId)
    return createdGroupId
  }

  const newGroupId = newElementId(DIAGRAM_GROUP_FRAME_TYPE, stamp, seq)
  idMap.set(binding.localFrameId, newGroupId)

  lf.addNode({
    id: newGroupId,
    type: DIAGRAM_GROUP_FRAME_TYPE,
    x: (frameElement.data.x as number) + offsetX,
    y: (frameElement.data.y as number) + offsetY,
    properties: stripClipboardMembershipProperties(
      (frameElement.data.properties ?? {}) as Record<string, unknown>
    )
  })

  const groupModel = lf.getNodeModelById(newGroupId)
  if (groupModel) {
    if (frameElement.data.width != null) groupModel.width = frameElement.data.width as number
    if (frameElement.data.height != null) groupModel.height = frameElement.data.height as number
  }

  mergeUngroupedIntoDiagramGroup(lf, newGroupId, memberNodeIds, memberEdgeIds)
  ensureGroupFrameAtBottom(lf, newGroupId)
  return newGroupId
}

function finalizeStandaloneMembership(
  lf: LogicFlow,
  payload: DiagramClipboardPayload,
  idMap: Map<string, string>
): void {
  const groupedLocalIds = collectGroupedMemberLocalIds(payload)
  for (const [localId, newId] of idMap) {
    if (groupedLocalIds.has(localId)) continue
    clearElementGroupMembership(lf, newId)
  }
}

export function pasteDiagramClipboardPayload(
  lf: LogicFlow,
  payload: DiagramClipboardPayload,
  options: PasteDiagramClipboardOptions
): { nodeIds: string[]; edgeIds: string[]; groupFrameIds: string[] } {
  if (!payload.elements.length) {
    return { nodeIds: [], edgeIds: [], groupFrameIds: [] }
  }

  const deferredFrameLocalIds = new Set(payload.groups.map((g) => g.localFrameId))
  const { offsetX, offsetY } = pasteOffsetForPayload(payload, deferredFrameLocalIds, options)
  const idMap = new Map<string, string>()
  const stamp = Date.now()
  let seq = 0

  const createdNodeIds: string[] = []
  const createdEdgeIds: string[] = []
  const createdGroupFrameIds: string[] = []
  const standaloneNodeIds: string[] = []

  for (const element of payload.elements) {
    if (element.kind !== 'node') continue
    if (deferredFrameLocalIds.has(element.localId)) continue
    const newId = pasteNodeElement(lf, element, offsetX, offsetY, stamp, seq++, idMap, createdNodeIds)
    if (!collectGroupedMemberLocalIds(payload).has(element.localId)) {
      standaloneNodeIds.push(newId)
    }
  }

  for (const element of payload.elements) {
    if (element.kind !== 'edge') continue
    pasteEdgeElement(lf, element, offsetX, offsetY, stamp, seq++, idMap, createdEdgeIds)
  }

  for (const binding of payload.groups) {
    const frameElement = payload.elements.find(
      (el) => el.localId === binding.localFrameId && el.kind === 'node'
    )
    if (!frameElement) continue
    const newGroupId = pasteGroupBinding(
      lf,
      binding,
      frameElement,
      idMap,
      offsetX,
      offsetY,
      stamp,
      seq++
    )
    if (!newGroupId) continue
    createdGroupFrameIds.push(newGroupId)
    createdNodeIds.push(newGroupId)
  }

  finalizeStandaloneMembership(lf, payload, idMap)

  const memberIdsInNewGroups = new Set<string>()
  for (const binding of payload.groups) {
    for (const localId of binding.memberLocalNodeIds) {
      const mapped = idMap.get(localId)
      if (mapped) memberIdsInNewGroups.add(mapped)
    }
  }

  const selectNodeIds = [
    ...createdGroupFrameIds,
    ...standaloneNodeIds.filter((id) => !memberIdsInNewGroups.has(id))
  ]
  const selectEdgeIds = payload.groups.length
    ? createdEdgeIds.filter((edgeId) => {
        const edge = lf.getEdgeModelById(edgeId)
        const gid = edge?.properties?.dgGroupId
        return typeof gid !== 'string' || !gid || !createdGroupFrameIds.includes(gid)
      })
    : createdEdgeIds

  if (selectNodeIds.length) {
    options.select(selectNodeIds, selectEdgeIds.length ? selectEdgeIds : undefined)
    if (options.snapGrid) {
      const snapTargets = payload.groups.length
        ? [...new Set([...selectNodeIds, ...memberIdsInNewGroups])]
        : selectNodeIds
      snapNodesAfterDrag(lf, snapTargets, true, snapTargets[0])
      syncGroupFramesForNodes(lf, snapTargets)
    }
  } else if (selectEdgeIds.length) {
    options.select([], selectEdgeIds)
  }

  return {
    nodeIds: createdNodeIds,
    edgeIds: createdEdgeIds,
    groupFrameIds: createdGroupFrameIds
  }
}
