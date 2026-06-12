import type LogicFlow from '@logicflow/core'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'
import { isPointNearEdgePolyline } from '@modules/library/diagrams/lib/diagramEdgeInsert'

export type DiagramCanvasPickKind = 'node' | 'edge' | 'blank'

export interface DiagramCanvasPickResult {
  kind: DiagramCanvasPickKind
  targetId?: string
}

const DEFAULT_EDGE_HIT_THRESHOLD = 8

/** 从 DOM 事件目标解析图元/连线 id（右键菜单等） */
export function pickDiagramElementFromDom(
  lf: LogicFlow,
  target: EventTarget | null
): { kind: 'node' | 'edge'; targetId: string } | null {
  const el = target as Element | null
  const group = el?.closest?.('g[id]') as SVGGElement | null
  const id = group?.id
  if (!id) return null
  if (lf.getNodeModelById(id)) return { kind: 'node', targetId: id }
  if (lf.getEdgeModelById(id)) return { kind: 'edge', targetId: id }
  return null
}

/** 画布坐标命中检测（内容图元 → 组合框 → 连线） */
export function pickDiagramElementAtCanvasPoint(
  lf: LogicFlow,
  canvasX: number,
  canvasY: number,
  edgeHitThreshold = DEFAULT_EDGE_HIT_THRESHOLD
): DiagramCanvasPickResult {
  const contentNodes = lf.graphModel.nodes.filter((model) => !isGroupFrameModel(model))
  for (const model of [...contentNodes].reverse()) {
    const halfW = model.width / 2
    const halfH = model.height / 2
    if (
      canvasX >= model.x - halfW &&
      canvasX <= model.x + halfW &&
      canvasY >= model.y - halfH &&
      canvasY <= model.y + halfH
    ) {
      return { kind: 'node', targetId: model.id }
    }
  }

  const groupFrames = lf.graphModel.nodes.filter((model) => isGroupFrameModel(model))
  for (const model of [...groupFrames].reverse()) {
    const halfW = model.width / 2
    const halfH = model.height / 2
    if (
      canvasX >= model.x - halfW &&
      canvasX <= model.x + halfW &&
      canvasY >= model.y - halfH &&
      canvasY <= model.y + halfH
    ) {
      return { kind: 'node', targetId: model.id }
    }
  }

  for (const model of [...lf.graphModel.edges].reverse()) {
    if (isPointNearEdgePolyline(model.pointsList, canvasX, canvasY, edgeHitThreshold)) {
      return { kind: 'edge', targetId: model.id }
    }
  }

  return { kind: 'blank' }
}

/** 客户端坐标命中检测 */
export function pickDiagramElementAtClient(
  lf: LogicFlow,
  clientX: number,
  clientY: number,
  clientToCanvas: (clientX: number, clientY: number) => { x: number; y: number },
  edgeHitThreshold = DEFAULT_EDGE_HIT_THRESHOLD
): DiagramCanvasPickResult {
  const { x, y } = clientToCanvas(clientX, clientY)
  return pickDiagramElementAtCanvasPoint(lf, x, y, edgeHitThreshold)
}
