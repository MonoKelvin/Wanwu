import { h, AdjustType } from '@logicflow/core'
import { DiagramAdjustPoint } from '@modules/library/diagrams/lib/diagramAdjustPoint'

/** LogicFlow h() 的 VNode 泛型与 Preact 不完全一致，内部渲染统一放宽 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LfVNode = any

const ADJUST_HIT_RADIUS = 14

type PointLike = { x?: number; y?: number } | null | undefined

function isValidPoint(p: PointLike): p is { x: number; y: number } {
  return p != null && Number.isFinite(p.x) && Number.isFinite(p.y)
}

function resolveAdjustEndpoint(primary: PointLike, fallback: PointLike): { x: number; y: number } {
  if (isValidPoint(primary)) return { x: primary.x, y: primary.y }
  if (isValidPoint(fallback)) return { x: fallback.x, y: fallback.y }
  return { x: 0, y: 0 }
}

type AdjustEdgeModel = {
  getAdjustStart: () => PointLike
  getAdjustEnd: () => PointLike
  startPoint: { x: number; y: number }
  endPoint: { x: number; y: number }
  getAdjustPointStyle: () => Record<string, unknown>
}

type AdjustGraphModel = {
  editConfigModel: {
    adjustEdgeStartAndEnd: boolean
    adjustEdgeStart: boolean
    adjustEdgeEnd: boolean
  }
}

/** 交互热区（DiagramAdjustPoint）+ 始终跟随 model 端点坐标的可见圆点 */
export function renderEdgeAdjustLayer(
  edgeModel: AdjustEdgeModel,
  graphModel: AdjustGraphModel,
  getAdjustPointShape: (x: number, y: number, model: AdjustEdgeModel) => LfVNode
): LfVNode {
  const { adjustEdgeStartAndEnd, adjustEdgeStart, adjustEdgeEnd } = graphModel.editConfigModel
  if (!adjustEdgeStartAndEnd) return h('g', {}) as LfVNode

  const start = resolveAdjustEndpoint(edgeModel.getAdjustStart(), edgeModel.startPoint)
  const end = resolveAdjustEndpoint(edgeModel.getAdjustEnd(), edgeModel.endPoint)
  const style = edgeModel.getAdjustPointStyle()
  const dotR = Number(style.r) || 5

  const interactive: LfVNode[] = []
  if (adjustEdgeStart) {
    interactive.push(
      h(DiagramAdjustPoint as never, {
        type: AdjustType.SOURCE,
        x: start.x,
        y: start.y,
        getAdjustPointShape,
        edgeModel,
        graphModel
      }) as LfVNode
    )
  }
  if (adjustEdgeEnd) {
    interactive.push(
      h(DiagramAdjustPoint as never, {
        type: AdjustType.TARGET,
        x: end.x,
        y: end.y,
        getAdjustPointShape,
        edgeModel,
        graphModel
      }) as LfVNode
    )
  }

  const liveDots: LfVNode[] = []
  if (adjustEdgeStart) {
    liveDots.push(
      h('circle', {
        className: 'dg-edge-adjust-point__dot dg-edge-adjust-point__dot--live',
        cx: start.x,
        cy: start.y,
        r: dotR,
        fill: style.fill as string | undefined,
        stroke: style.stroke as string | undefined,
        strokeWidth: style.strokeWidth as number | undefined
      })
    )
  }
  if (adjustEdgeEnd) {
    liveDots.push(
      h('circle', {
        className: 'dg-edge-adjust-point__dot dg-edge-adjust-point__dot--live',
        cx: end.x,
        cy: end.y,
        r: dotR,
        fill: style.fill as string | undefined,
        stroke: style.stroke as string | undefined,
        strokeWidth: style.strokeWidth as number | undefined
      })
    )
  }

  return h('g', { className: 'dg-edge-adjust-layer' }, [...interactive, ...liveDots] as never) as LfVNode
}

export function edgeAdjustHitShape(x: number, y: number): LfVNode {
  const cx = Number.isFinite(x) ? x : 0
  const cy = Number.isFinite(y) ? y : 0
  return h('circle', {
    className: 'dg-edge-adjust-point__hit',
    cx,
    cy,
    r: ADJUST_HIT_RADIUS,
    fill: 'transparent',
    stroke: 'none'
  })
}
