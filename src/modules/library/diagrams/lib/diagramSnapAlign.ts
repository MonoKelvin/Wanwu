import type LogicFlow from '@logicflow/core'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'

/** 松手/拖拽时与邻近图元边缘/中心磁吸的最大距离（px） */
export const DIAGRAM_ALIGN_SNAP_THRESHOLD = 10

/** LogicFlow snapline 显示对齐线的容差（px） */
export const DIAGRAM_SNAPLINE_EPSILON = DIAGRAM_ALIGN_SNAP_THRESHOLD

/** 邻近图元搜索：外缘间距上限（px） */
const NEARBY_EDGE_GAP_MAX = 160

/** 参与对齐计算的邻近图元数量上限 */
const NEARBY_REF_LIMIT = 40

/** 指针落在图元左/上/右/下区域的划分比例（中间为 center 区） */
const EDGE_ZONE_RATIO = 0.22

export const RESIZE_HANDLE_AXIS_KIND: Record<number, { x: AxisKind; y: AxisKind }> = {
  0: { x: 'min', y: 'min' },
  1: { x: 'max', y: 'min' },
  2: { x: 'max', y: 'max' },
  3: { x: 'min', y: 'max' }
}

interface NodeBBox {
  cx: number
  cy: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type AxisKind = 'min' | 'mid' | 'max'

export interface AlignmentPointerContext {
  canvasX: number
  canvasY: number
}

export interface AlignmentGrabRatios {
  x: number
  y: number
}

export interface AlignmentGuideInfo {
  isShowHorizontal: boolean
  isShowVertical: boolean
  position: { x: number; y: number }
}

export interface AlignmentSnapOptions {
  threshold?: number
  pointer?: AlignmentPointerContext
  /** 拖拽开始时记录的抓取点，避免拖动中指针离开图元导致边线优先级丢失 */
  grabRatios?: AlignmentGrabRatios
  preferredX?: AxisKind
  preferredY?: AxisKind
  /** 缩放预览包围盒：对齐计算用该框而非当前节点模型 */
  movingBBoxOverride?: NodeBBox
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function readNodeBBox(lf: LogicFlow, nodeId: string): NodeBBox | null {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return null
  const minX = model.x - model.width / 2
  const maxX = model.x + model.width / 2
  const minY = model.y - model.height / 2
  const maxY = model.y + model.height / 2
  return { cx: model.x, cy: model.y, minX, maxX, minY, maxY }
}

function readMovingBBox(lf: LogicFlow, anchorId: string, movingNodeIds: string[]): NodeBBox | null {
  const ids = movingNodeIds.length ? movingNodeIds : [anchorId]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const id of ids) {
    const box = readNodeBBox(lf, id)
    if (!box) continue
    minX = Math.min(minX, box.minX)
    maxX = Math.max(maxX, box.maxX)
    minY = Math.min(minY, box.minY)
    maxY = Math.max(maxY, box.maxY)
  }

  if (!Number.isFinite(minX)) return readNodeBBox(lf, anchorId)
  return {
    minX,
    maxX,
    minY,
    maxY,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  }
}

function edgeGapBetweenBoxes(a: NodeBBox, b: NodeBBox): number {
  const gapX = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX))
  const gapY = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY))
  return Math.hypot(gapX, gapY)
}

function collectReferenceBoxes(
  lf: LogicFlow,
  movingBBox: NodeBBox,
  movingNodeIds: string[],
  maxGap = NEARBY_EDGE_GAP_MAX
): NodeBBox[] {
  const exclude = new Set(movingNodeIds)
  const ranked: Array<{ box: NodeBBox; gap: number }> = []

  for (const node of lf.graphModel.nodes) {
    if (exclude.has(node.id) || isGroupFrameModel(node)) continue
    const box = readNodeBBox(lf, node.id)
    if (!box) continue
    const gap = edgeGapBetweenBoxes(movingBBox, box)
    if (gap > maxGap) continue
    ranked.push({ box, gap })
  }

  ranked.sort((a, b) => a.gap - b.gap)
  return ranked.slice(0, NEARBY_REF_LIMIT).map((item) => item.box)
}

export function pointerRatiosInBBox(
  bbox: NodeBBox,
  pointer?: AlignmentPointerContext
): AlignmentGrabRatios {
  if (!pointer) return { x: 0.5, y: 0.5 }
  const width = bbox.maxX - bbox.minX
  const height = bbox.maxY - bbox.minY
  return {
    x: width > 0 ? clamp((pointer.canvasX - bbox.minX) / width, 0, 1) : 0.5,
    y: height > 0 ? clamp((pointer.canvasY - bbox.minY) / height, 0, 1) : 0.5
  }
}

export function computeGrabRatiosFromPointer(
  lf: LogicFlow,
  anchorId: string,
  movingNodeIds: string[],
  pointer?: AlignmentPointerContext
): AlignmentGrabRatios {
  const bbox = readMovingBBox(lf, anchorId, movingNodeIds)
  if (!bbox) return { x: 0.5, y: 0.5 }
  return pointerRatiosInBBox(bbox, pointer)
}

function pickPrimaryAxisKind(ratio: number): AxisKind {
  if (ratio <= EDGE_ZONE_RATIO) return 'min'
  if (ratio >= 1 - EDGE_ZONE_RATIO) return 'max'
  return 'mid'
}

function axisValue(bbox: NodeBBox, axis: 'x' | 'y', kind: AxisKind): number {
  if (axis === 'x') {
    if (kind === 'min') return bbox.minX
    if (kind === 'max') return bbox.maxX
    return bbox.cx
  }
  if (kind === 'min') return bbox.minY
  if (kind === 'max') return bbox.maxY
  return bbox.cy
}

function axisCandidateOrder(ratio: number, preferred?: AxisKind): AxisKind[] {
  if (preferred === 'min') return ['min', 'mid', 'max']
  if (preferred === 'max') return ['max', 'mid', 'min']
  if (preferred === 'mid') return ['mid', 'min', 'max']
  const primary = pickPrimaryAxisKind(ratio)
  if (primary === 'min') return ['min', 'mid', 'max']
  if (primary === 'max') return ['max', 'mid', 'min']
  return ['mid', 'min', 'max']
}

function candidateWeight(index: number, isPrimaryOnly: boolean): number {
  if (index === 0) return 1
  if (isPrimaryOnly) return 0.28
  return index === 1 ? 0.38 : 0.16
}

function refAxisEntries(bbox: NodeBBox, axis: 'x' | 'y'): Array<{ kind: AxisKind; value: number }> {
  const kinds: AxisKind[] = ['min', 'mid', 'max']
  return kinds.map((kind) => ({ kind, value: axisValue(bbox, axis, kind) }))
}

function refKindAffinity(dragKind: AxisKind, refKind: AxisKind): number {
  const order: AxisKind[] = ['min', 'mid', 'max']
  const gap = Math.abs(order.indexOf(dragKind) - order.indexOf(refKind))
  if (gap === 0) return 1
  if (gap === 1) return 0.88
  return 0.68
}

function scanAxisAlignment(
  movingBBox: NodeBBox,
  refBoxes: NodeBBox[],
  axis: 'x' | 'y',
  threshold: number,
  ratio: number,
  preferred?: AxisKind
): { delta: number; guidePos: number; show: boolean } {
  const order = axisCandidateOrder(ratio, preferred)
  let bestScore = threshold + 1
  let bestDelta = 0
  let bestGuidePos = axis === 'x' ? movingBBox.cx : movingBBox.cy
  let bestShow = false

  for (let i = 0; i < order.length; i += 1) {
    const kind = order[i]!
    const dragValue = axisValue(movingBBox, axis, kind)
    const weight = candidateWeight(i, i === 0)
    let localBest = threshold + 1
    let localDelta = 0
    let localGuide = dragValue
    let localShow = false

    for (const ref of refBoxes) {
      for (const refEntry of refAxisEntries(ref, axis)) {
        const dist = Math.abs(dragValue - refEntry.value)
        if (dist > threshold) continue
        const score = dist / (weight * refKindAffinity(kind, refEntry.kind))
        if (score < localBest) {
          localBest = score
          localDelta = refEntry.value - dragValue
          localGuide = dragValue
          localShow = true
        }
      }
    }

    if (localShow) {
      if (i === 0 || !bestShow || localBest < bestScore) {
        bestScore = localBest
        bestDelta = localDelta
        bestGuidePos = localGuide
        bestShow = true
      }
      if (i === 0) break
    }
  }

  return {
    delta: bestShow ? bestDelta : 0,
    guidePos: bestGuidePos,
    show: bestShow
  }
}

function resolveAlignmentContext(
  lf: LogicFlow,
  anchorId: string,
  movingNodeIds: string[],
  options?: AlignmentSnapOptions
): {
  movingBBox: NodeBBox | null
  refs: NodeBBox[]
  grabRatios: AlignmentGrabRatios
  threshold: number
  preferredX?: AxisKind
  preferredY?: AxisKind
} {
  const threshold = options?.threshold ?? DIAGRAM_ALIGN_SNAP_THRESHOLD
  const movingBBox =
    options?.movingBBoxOverride ?? readMovingBBox(lf, anchorId, movingNodeIds)
  if (!movingBBox) {
    return {
      movingBBox: null,
      refs: [],
      grabRatios: { x: 0.5, y: 0.5 },
      threshold,
      preferredX: options?.preferredX,
      preferredY: options?.preferredY
    }
  }
  const grabRatios =
    options?.grabRatios ?? pointerRatiosInBBox(movingBBox, options?.pointer)
  const refs = collectReferenceBoxes(lf, movingBBox, movingNodeIds)
  return {
    movingBBox,
    refs,
    grabRatios,
    threshold,
    preferredX: options?.preferredX,
    preferredY: options?.preferredY
  }
}

function normalizeSnapOptions(
  thresholdOrOptions: number | AlignmentSnapOptions,
  legacyPointer?: AlignmentPointerContext
): AlignmentSnapOptions {
  return typeof thresholdOrOptions === 'number'
    ? { threshold: thresholdOrOptions, pointer: legacyPointer }
    : thresholdOrOptions
}

export function computeAlignmentSnapDelta(
  lf: LogicFlow,
  anchorId: string,
  movingNodeIds: string[],
  thresholdOrOptions: number | AlignmentSnapOptions = DIAGRAM_ALIGN_SNAP_THRESHOLD,
  legacyPointer?: AlignmentPointerContext
): { dx: number; dy: number } {
  const options = normalizeSnapOptions(thresholdOrOptions, legacyPointer)
  const { movingBBox, refs, grabRatios, threshold, preferredX, preferredY } =
    resolveAlignmentContext(lf, anchorId, movingNodeIds, options)
  if (!movingBBox || !refs.length) return { dx: 0, dy: 0 }

  const x = scanAxisAlignment(
    movingBBox,
    refs,
    'x',
    threshold,
    grabRatios.x,
    preferredX
  )
  const y = scanAxisAlignment(
    movingBBox,
    refs,
    'y',
    threshold,
    grabRatios.y,
    preferredY
  )
  return { dx: x.delta, dy: y.delta }
}

export function computeAlignmentGuideInfo(
  lf: LogicFlow,
  anchorId: string,
  movingNodeIds: string[],
  thresholdOrOptions: number | AlignmentSnapOptions = DIAGRAM_SNAPLINE_EPSILON,
  legacyPointer?: AlignmentPointerContext
): AlignmentGuideInfo {
  const options = normalizeSnapOptions(thresholdOrOptions, legacyPointer)
  const empty: AlignmentGuideInfo = {
    isShowHorizontal: false,
    isShowVertical: false,
    position: { x: 0, y: 0 }
  }

  const { movingBBox, refs, grabRatios, threshold, preferredX, preferredY } =
    resolveAlignmentContext(lf, anchorId, movingNodeIds, options)
  if (!movingBBox || !refs.length) return empty

  const x = scanAxisAlignment(
    movingBBox,
    refs,
    'x',
    threshold,
    grabRatios.x,
    preferredX
  )
  const y = scanAxisAlignment(
    movingBBox,
    refs,
    'y',
    threshold,
    grabRatios.y,
    preferredY
  )
  return {
    isShowVertical: x.show,
    isShowHorizontal: y.show,
    position: { x: x.guidePos, y: y.guidePos }
  }
}

export function readAlignmentPointerFromClient(
  lf: LogicFlow,
  clientX: number,
  clientY: number
): AlignmentPointerContext {
  const pt = lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
  return { canvasX: pt.x, canvasY: pt.y }
}

export function readAlignmentPointerFromDragEvent(
  lf: LogicFlow,
  e?: MouseEvent | TouchEvent
): AlignmentPointerContext | undefined {
  if (!e) return undefined
  if ('clientX' in e && Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
    return readAlignmentPointerFromClient(lf, e.clientX, e.clientY)
  }
  if ('touches' in e) {
    const touch = e.touches?.[0] ?? e.changedTouches?.[0]
    if (touch) return readAlignmentPointerFromClient(lf, touch.clientX, touch.clientY)
  }
  return undefined
}

export type { AxisKind }
