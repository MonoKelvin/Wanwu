import type LogicFlow from '@logicflow/core'
import {
  isEdgeInSelectionBox,
  isNodeInSelectionBox
} from '@modules/library/diagrams/lib/diagramBoxSelection'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'

export type DiagramPointerModifiers = {
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
}

function modifierState(e: MouseEvent | PointerEvent, key: 'Control' | 'Meta' | 'Shift'): boolean {
  try {
    return e.getModifierState(key)
  } catch {
    return false
  }
}

export function readPointerModifiers(
  e?: MouseEvent | PointerEvent | null
): DiagramPointerModifiers {
  if (!e) {
    return { ctrlKey: false, metaKey: false, shiftKey: false }
  }
  return {
    ctrlKey: Boolean(e.ctrlKey || modifierState(e, 'Control')),
    metaKey: Boolean(e.metaKey || modifierState(e, 'Meta')),
    shiftKey: Boolean(e.shiftKey || modifierState(e, 'Shift'))
  }
}

/** Ctrl/Meta：切换多选（与 draw.io isToggleEvent 一致） */
export function isToggleSelectKey(e?: MouseEvent | PointerEvent | null): boolean {
  const mods = readPointerModifiers(e)
  return mods.ctrlKey || mods.metaKey
}

/** Shift（无 Ctrl/Meta）：框选减选；按住 Ctrl/Meta 时仍以加选为准 */
export function isBoxSubtractKey(e?: MouseEvent | PointerEvent | null): boolean {
  const mods = readPointerModifiers(e)
  return mods.shiftKey && !mods.ctrlKey && !mods.metaKey
}

/** 是否处于修饰键多选流程（点击空白不清空选区） */
export function isModifierSelectionGesture(e?: MouseEvent | PointerEvent | null): boolean {
  return isToggleSelectKey(e) || isBoxSubtractKey(e)
}

export type DiagramBoxSelectSnapshot = {
  nodeIds: readonly string[]
  edgeIds: readonly string[]
}

export type DiagramBoxSelectMode = 'replace' | 'append' | 'subtract'

/** Ctrl/Meta 优先于 Shift：加选 > 减选 > 替换 */
export function resolveBoxSelectMode(modifiers: DiagramPointerModifiers): DiagramBoxSelectMode {
  if (modifiers.ctrlKey || modifiers.metaKey) return 'append'
  if (modifiers.shiftKey) return 'subtract'
  return 'replace'
}

export function isBoxModifierGesture(modifiers: DiagramPointerModifiers): boolean {
  return resolveBoxSelectMode(modifiers) !== 'replace'
}

/** 框选手势中累积修饰键（mousedown / move / up 均参与） */
export function absorbPointerModifiers(
  target: DiagramPointerModifiers,
  e?: MouseEvent | PointerEvent | null
): void {
  if (!e) return
  const mods = readPointerModifiers(e)
  if (mods.ctrlKey) target.ctrlKey = true
  if (mods.metaKey) target.metaKey = true
  if (mods.shiftKey) target.shiftKey = true
}

/** 框选手势中累积键盘修饰键（拖拽时按住 Ctrl/Shift 可能无 pointer 事件） */
export function absorbKeyboardModifiers(
  target: DiagramPointerModifiers,
  e: KeyboardEvent
): void {
  if (e.getModifierState('Control') || e.key === 'Control') target.ctrlKey = true
  if (e.getModifierState('Meta') || e.key === 'Meta') target.metaKey = true
  if (e.getModifierState('Shift') || e.key === 'Shift') target.shiftKey = true
}

/**
 * Ctrl/Meta 点选：以点击前的选区快照为准，覆盖 LogicFlow handleClick 可能造成的单选收成。
 * draw.io selectCellForEvent 语义：已选→取消，未选→在原有选区上追加。
 */
export function reconcileModifierNodeClick(
  lf: LogicFlow,
  nodeId: string,
  previouslySelectedIds: readonly string[],
  opts?: { skipGroupFrame?: boolean }
): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return
  if (opts?.skipGroupFrame !== false && model.type === DIAGRAM_GROUP_FRAME_TYPE) return

  const wasSelected = previouslySelectedIds.includes(nodeId)
  if (wasSelected) {
    lf.deselectElementById(nodeId)
    return
  }

  for (const id of previouslySelectedIds) {
    lf.selectElementById(id, true)
  }
  lf.selectElementById(nodeId, true)
}

/**
 * draw.io selectCellForEvent 语义：
 * - 修饰键：已选 → 取消，未选 → 追加
 * - 普通点击：单选（仅当未选或当前多选时替换）
 */
export function applyNodeSelectForPointer(
  lf: LogicFlow,
  nodeId: string,
  e: MouseEvent | PointerEvent | undefined,
  previouslySelectedIds: readonly string[],
  opts?: { skipGroupFrame?: boolean }
): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return
  if (opts?.skipGroupFrame !== false && model.type === DIAGRAM_GROUP_FRAME_TYPE) return

  const wasSelected = previouslySelectedIds.includes(nodeId)

  if (isToggleSelectKey(e)) {
    if (wasSelected) {
      lf.deselectElementById(nodeId)
    } else {
      lf.selectElementById(nodeId, true)
    }
    return
  }

  if (!wasSelected || previouslySelectedIds.length !== 1 || previouslySelectedIds[0] !== nodeId) {
    lf.selectElementById(nodeId, false)
  }
}

/**
 * draw.io selectCellsForEvent 语义：
 * - 普通框选：替换选区
 * - Ctrl/Meta 框选：加选（含 Ctrl/Meta + Shift）
 * - Shift 框选：减选
 */
export function applyBoxSelectForPointer(
  lf: LogicFlow,
  nodeIds: readonly string[],
  edgeIds: readonly string[],
  e?: MouseEvent | PointerEvent | null,
  opts?: {
    modifiers?: DiagramPointerModifiers
    preSelection?: DiagramBoxSelectSnapshot
  }
): void {
  const modifiers = opts?.modifiers ?? readPointerModifiers(e)
  const mode = resolveBoxSelectMode(modifiers)
  const pre = opts?.preSelection ?? { nodeIds: [], edgeIds: [] }
  const boxNodeIds = new Set(nodeIds)
  const boxEdgeIds = new Set(edgeIds)

  if (mode === 'subtract') {
    const remainNodeIds = pre.nodeIds.filter((id) => !boxNodeIds.has(id))
    const remainEdgeIds = pre.edgeIds.filter((id) => !boxEdgeIds.has(id))
    lf.clearSelectElements()
    for (const id of remainNodeIds) lf.selectElementById(id, true)
    for (const id of remainEdgeIds) lf.selectElementById(id, true)
    return
  }

  if (mode === 'append') {
    const preNodeIds = new Set(pre.nodeIds)
    const preEdgeIds = new Set(pre.edgeIds)
    const addNodeIds = nodeIds.filter((id) => !preNodeIds.has(id))
    const addEdgeIds = edgeIds.filter((id) => !preEdgeIds.has(id))
    lf.clearSelectElements()
    for (const id of pre.nodeIds) lf.selectElementById(id, true)
    for (const id of pre.edgeIds) lf.selectElementById(id, true)
    for (const id of addNodeIds) lf.selectElementById(id, true)
    for (const id of addEdgeIds) lf.selectElementById(id, true)
    return
  }

  lf.clearSelectElements()
  for (const id of nodeIds) lf.selectElementById(id, true)
  for (const id of edgeIds) lf.selectElementById(id, true)
}

export function collectElementsInCanvasBox(
  lf: LogicFlow,
  leftTop: [number, number],
  rightBottom: [number, number],
  contain: boolean,
  opts?: { skipGroupFrame?: boolean }
): { nodeIds: string[]; edgeIds: string[] } {
  const nodeIds: string[] = []
  const edgeIds: string[] = []

  for (const model of lf.graphModel.nodes) {
    if (opts?.skipGroupFrame !== false && model.type === DIAGRAM_GROUP_FRAME_TYPE) continue
    if (!isNodeInSelectionBox(model, leftTop, rightBottom, contain)) continue
    nodeIds.push(model.id)
  }

  for (const model of lf.graphModel.edges) {
    if (!isEdgeInSelectionBox(model, leftTop, rightBottom, contain)) continue
    edgeIds.push(model.id)
  }

  return { nodeIds, edgeIds }
}

function pointInNode(
  node: { x: number; y: number; width: number; height: number },
  x: number,
  y: number
): boolean {
  const halfW = node.width / 2
  const halfH = node.height / 2
  return x >= node.x - halfW && x <= node.x + halfW && y >= node.y - halfH && y <= node.y + halfH
}

function nodesAtCanvasPoint(
  lf: LogicFlow,
  canvasX: number,
  canvasY: number,
  skipGroupFrame = true
): LogicFlow.BaseNodeModel[] {
  return lf.graphModel.nodes.filter((node) => {
    if (skipGroupFrame && node.type === DIAGRAM_GROUP_FRAME_TYPE) return false
    if (node.visible === false) return false
    return pointInNode(node, canvasX, canvasY)
  })
}

function sortNodesByStackOrder(models: LogicFlow.BaseNodeModel[]): LogicFlow.BaseNodeModel[] {
  return [...models].sort((a, b) => {
    const za = a.zIndex ?? 0
    const zb = b.zIndex ?? 0
    if (za !== zb) return za - zb
    return 0
  })
}

/**
 * 画布坐标命中图元；Ctrl 加选时优先取最上层「未选」图元，避免被多选热区上方的已选图元挡住。
 */
export function pickNodeIdAtClient(
  lf: LogicFlow,
  clientX: number,
  clientY: number,
  opts?: { preferUnselected?: boolean; skipGroupFrame?: boolean }
): string | null {
  const { x, y } = lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
  const hits = nodesAtCanvasPoint(lf, x, y, opts?.skipGroupFrame !== false)
  if (!hits.length) return null

  const stacked = sortNodesByStackOrder(hits)
  if (opts?.preferUnselected) {
    const unselected = stacked.filter((node) => !node.isSelected)
    if (unselected.length) return unselected[unselected.length - 1]!.id
  }
  return stacked[stacked.length - 1]!.id
}

/** DOM + 画布双路径命中，修饰键加选时偏向未选图元 */
export function pickNodeIdAtPointer(
  lf: LogicFlow,
  clientX: number,
  clientY: number,
  opts?: { preferUnselected?: boolean; domTarget?: Element | null }
): string | null {
  const domEl = opts?.domTarget ?? null
  const group = domEl?.closest?.('g[id]') as SVGGElement | null
  const domId = group?.id
  const domModel = domId ? lf.getNodeModelById(domId) : null

  if (
    domModel &&
    domModel.type !== DIAGRAM_GROUP_FRAME_TYPE &&
    (!opts?.preferUnselected || !domModel.isSelected)
  ) {
    return domModel.id
  }

  return pickNodeIdAtClient(lf, clientX, clientY, {
    preferUnselected: opts?.preferUnselected,
    skipGroupFrame: true
  })
}

