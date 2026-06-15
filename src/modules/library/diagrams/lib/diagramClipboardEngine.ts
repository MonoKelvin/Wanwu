import type LogicFlow from '@logicflow/core'
import {
  DIAGRAM_GROUP_FRAME_TYPE,
  clearElementGroupMembership,
  collectDiagramGroupContentForCopy,
  finalizeStandalonePasteElements,
  isGroupFrameModel,
  isGroupFrameType,
  scrubElementsFromAllGroupFrames,
  syncDiagramGroupMembershipFromFrames
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { ensureGroupFrameAtBottom, syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import { mergeUngroupedIntoDiagramGroup } from '@modules/library/diagrams/lib/diagramGroupFrameOps'
import { DEFAULT_GROUP_STYLE } from '@modules/library/diagrams/lib/diagramGroupFrameTheme'
import { selectionBoundsCenter } from '@modules/library/diagrams/lib/diagramNodeLayout'
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
  stripClipboardMembershipProperties,
  buildPasteElementProperties
} from '@modules/library/diagrams/lib/diagramClipboardPayload'
import { lfTextToClipboardString } from '@modules/library/diagrams/lib/diagramClipboardText'

function cloneModelProperties(properties: unknown): Record<string, unknown> {
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

function serializeNode(
  model: NonNullable<ReturnType<LogicFlow['getNodeModelById']>>,
  copyMode: DiagramClipboardCopyMode
): DiagramClipboardElement {
  const rawProps =
    'getProperties' in model && typeof model.getProperties === 'function'
      ? (model.getProperties() as Record<string, unknown>)
      : cloneModelProperties(model.properties)
  return {
    localId: model.id,
    kind: 'node',
    type: String(model.type),
    copyMode,
    data: {
      x: model.x,
      y: model.y,
      width: model.width,
      height: model.height,
      text: lfTextToClipboardString(model.text),
      properties: sanitizeClipboardProperties(rawProps, {
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
  const rawProps =
    'getProperties' in model && typeof model.getProperties === 'function'
      ? (model.getProperties() as Record<string, unknown>)
      : cloneModelProperties(model.properties)
  const data: Record<string, unknown> = {
    sourceNodeId: model.sourceNodeId,
    targetNodeId: model.targetNodeId,
    text: lfTextToClipboardString(model.text),
    properties: sanitizeClipboardProperties(rawProps, {
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
    copyMode,
    data
  }
}

function upsertElement(
  map: Map<string, DiagramClipboardElement>,
  element: DiagramClipboardElement
): void {
  map.set(element.localId, element)
}

function appendGroupFrameToPayload(
  lf: LogicFlow,
  groupId: string,
  elementMap: Map<string, DiagramClipboardElement>,
  groups: DiagramClipboardGroupBinding[],
  ownedLocalIds: Set<string>
): void {
  const group = lf.getNodeModelById(groupId)
  if (!group) return

  const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContentForCopy(lf, groupId)

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

export function buildDiagramClipboardPayload(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): DiagramClipboardPayload | null {
  const plan = resolveDiagramClipboardCopyPlan(lf, nodeIds, edgeIds)
  if (!plan.groupFrameIds.length && !plan.nodeIds.length && !plan.edgeIds.length) {
    return null
  }

  const elementMap = new Map<string, DiagramClipboardElement>()
  const groups: DiagramClipboardGroupBinding[] = []
  const ownedLocalIds = new Set<string>()

  for (const groupId of plan.groupFrameIds) {
    appendGroupFrameToPayload(lf, groupId, elementMap, groups, ownedLocalIds)
  }

  for (const nodeId of plan.nodeIds) {
    if (ownedLocalIds.has(nodeId)) continue
    const model = lf.getNodeModelById(nodeId)
    if (!model) continue
    // 非 active 组合框跳过（isSelected 残留不得触发整组复制）
    if (isGroupFrameModel(model) || isGroupFrameType(model.type)) continue
    upsertElement(elementMap, serializeNode(model, 'standalone'))
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

function commitPastedElementId(
  idMap: Map<string, string>,
  localId: string,
  requestedId: string,
  actualId: string,
  createdIds: string[]
): string {
  idMap.set(localId, actualId)
  const existingIndex = createdIds.indexOf(requestedId)
  if (existingIndex >= 0) {
    createdIds[existingIndex] = actualId
  } else if (!createdIds.includes(actualId)) {
    createdIds.push(actualId)
  }
  return actualId
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
  // 键盘粘贴无坐标时：相对原位置偏移，避免对齐视口中心后与原组合框重叠
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

function isStandalonePasteElement(
  element: DiagramClipboardElement,
  payload: DiagramClipboardPayload,
  groupedLocalIds: Set<string>
): boolean {
  if (element.copyMode === 'standalone') return true
  if (payload.groups.length === 0) return element.copyMode !== 'group-frame'
  if (element.copyMode === 'group-content' || element.copyMode === 'group-frame') return false
  return !groupedLocalIds.has(element.localId)
}

function finalizePastedMembership(
  lf: LogicFlow,
  payload: DiagramClipboardPayload,
  idMap: Map<string, string>,
  groupedLocalIds: Set<string>,
  groupFrameLocalIds: Set<string>
): void {
  if (!payload.groups.length) {
    finalizeStandalonePasteElements(lf, [...idMap.values()])
    return
  }

  for (const [localId, newId] of idMap) {
    if (groupedLocalIds.has(localId) || groupFrameLocalIds.has(localId)) continue
    const element = payload.elements.find((el) => el.localId === localId)
    if (element && isStandalonePasteElement(element, payload, groupedLocalIds)) {
      finalizeStandalonePasteElements(lf, [newId])
    }
  }

  syncDiagramGroupMembershipFromFrames(lf)
}

function pasteNodeElement(
  lf: LogicFlow,
  element: DiagramClipboardElement,
  offsetX: number,
  offsetY: number,
  stamp: number,
  seq: number,
  idMap: Map<string, string>,
  createdNodeIds: string[],
  options: { standalone: boolean }
): string {
  const requestedId = newElementId(element.type, stamp, seq)
  idMap.set(element.localId, requestedId)

  const addedModel = lf.addNode({
    id: requestedId,
    type: element.type,
    x: (element.data.x as number) + offsetX,
    y: (element.data.y as number) + offsetY,
    text: element.data.text as string | undefined,
    properties: buildPasteElementProperties(element.data.properties, {
      standalone: options.standalone
    })
  })
  const actualId = commitPastedElementId(
    idMap,
    element.localId,
    requestedId,
    addedModel.id,
    createdNodeIds
  )

  const model = lf.getNodeModelById(actualId)
  if (model && (element.data.width != null || element.data.height != null)) {
    applyNodeDimensions(
      model as Parameters<typeof applyNodeDimensions>[0],
      (element.data.width as number | undefined) ?? Math.round(model.width),
      (element.data.height as number | undefined) ?? Math.round(model.height)
    )
  }

  if (options.standalone) {
    finalizeStandalonePasteElements(lf, [actualId])
  } else {
    clearElementGroupMembership(lf, actualId)
  }
  return actualId
}

function pasteEdgeElement(
  lf: LogicFlow,
  element: DiagramClipboardElement,
  offsetX: number,
  offsetY: number,
  stamp: number,
  seq: number,
  idMap: Map<string, string>,
  createdEdgeIds: string[],
  options: { standalone: boolean }
): string | null {
  const sourceNodeId = idMap.get(element.data.sourceNodeId as string)
  const targetNodeId = idMap.get(element.data.targetNodeId as string)
  if (!sourceNodeId || !targetNodeId) return null
  if (!lf.getNodeModelById(sourceNodeId) || !lf.getNodeModelById(targetNodeId)) return null

  const requestedId = newElementId(element.type, stamp, seq)
  idMap.set(element.localId, requestedId)

  const pointsList = offsetPolylinePoints(
    element.data.pointsList as Array<{ x: number; y: number }> | undefined,
    offsetX,
    offsetY
  )
  const startPoint = element.data.startPoint as { x: number; y: number } | undefined
  const endPoint = element.data.endPoint as { x: number; y: number } | undefined

  const addedModel = lf.addEdge({
    id: requestedId,
    type: element.type,
    sourceNodeId,
    targetNodeId,
    text: element.data.text as string | undefined,
    properties: buildPasteElementProperties(element.data.properties, {
      standalone: options.standalone
    }),
    ...(pointsList ? { pointsList } : {}),
    ...(startPoint
      ? { startPoint: { x: startPoint.x + offsetX, y: startPoint.y + offsetY } }
      : {}),
    ...(endPoint ? { endPoint: { x: endPoint.x + offsetX, y: endPoint.y + offsetY } } : {})
  })
  const actualId = commitPastedElementId(
    idMap,
    element.localId,
    requestedId,
    addedModel.id,
    createdEdgeIds
  )

  const edgeProps = readEdgeProperties(lf, actualId)
  if (edgeProps) applyEdgeProperties(lf, edgeProps)

  if (options.standalone) {
    finalizeStandalonePasteElements(lf, [actualId])
  } else {
    clearElementGroupMembership(lf, actualId)
  }
  return actualId
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

  scrubElementsFromAllGroupFrames(lf, [...memberNodeIds, ...memberEdgeIds])

  const targetX = (frameElement.data.x as number) + offsetX
  const targetY = (frameElement.data.y as number) + offsetY
  const frameProps = stripClipboardMembershipProperties(
    cloneModelProperties(frameElement.data.properties)
  )
  const frameStyle =
    frameProps.dgGroupStyle && typeof frameProps.dgGroupStyle === 'object'
      ? frameProps.dgGroupStyle
      : { ...DEFAULT_GROUP_STYLE }

  const newGroupId = newElementId(DIAGRAM_GROUP_FRAME_TYPE, stamp, seq)
  idMap.set(binding.localFrameId, newGroupId)

  const addedFrame = lf.addNode({
    id: newGroupId,
    type: DIAGRAM_GROUP_FRAME_TYPE,
    x: targetX,
    y: targetY,
    properties: {
      ...frameProps,
      dgGroupStyle: frameStyle
    }
  })
  const actualGroupId = commitPastedElementId(
    idMap,
    binding.localFrameId,
    newGroupId,
    addedFrame.id,
    []
  )

  const groupModel = lf.getNodeModelById(actualGroupId)
  if (groupModel) {
    if (frameElement.data.width != null) {
      groupModel.width = frameElement.data.width as number
    }
    if (frameElement.data.height != null) {
      groupModel.height = frameElement.data.height as number
    }
  }

  mergeUngroupedIntoDiagramGroup(lf, actualGroupId, memberNodeIds, memberEdgeIds)
  ensureGroupFrameAtBottom(lf, actualGroupId)
  return actualGroupId
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
  const groupedLocalIds = collectGroupedMemberLocalIds(payload)

  const pastedNodeLocalIds = new Set<string>()
  for (const element of payload.elements) {
    if (element.kind !== 'node') continue
    if (pastedNodeLocalIds.has(element.localId)) continue
    if (deferredFrameLocalIds.has(element.localId)) continue
    if (
      !payload.groups.length &&
      (element.type === DIAGRAM_GROUP_FRAME_TYPE || isGroupFrameType(element.type))
    ) {
      continue
    }
    pastedNodeLocalIds.add(element.localId)
    const isStandalone = isStandalonePasteElement(element, payload, groupedLocalIds)
    const newId = pasteNodeElement(
      lf,
      element,
      offsetX,
      offsetY,
      stamp,
      seq++,
      idMap,
      createdNodeIds,
      { standalone: isStandalone }
    )
    if (isStandalone) standaloneNodeIds.push(newId)
  }

  for (const element of payload.elements) {
    if (element.kind !== 'edge') continue
    const isStandalone = isStandalonePasteElement(element, payload, groupedLocalIds)
    pasteEdgeElement(lf, element, offsetX, offsetY, stamp, seq++, idMap, createdEdgeIds, {
      standalone: isStandalone
    })
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

  const groupFrameLocalIds = new Set(payload.groups.map((g) => g.localFrameId))
  finalizePastedMembership(lf, payload, idMap, groupedLocalIds, groupFrameLocalIds)

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
      if (payload.groups.length) {
        syncGroupFramesForNodes(lf, snapTargets)
      } else {
        finalizeStandalonePasteElements(lf, [...selectNodeIds, ...selectEdgeIds])
      }
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
