import { h, BezierEdge, LineEdge, PolylineEdge, AdjustPoint, AdjustType } from '@logicflow/core'

type EdgeViewCtor = typeof PolylineEdge

const ADJUST_HIT_RADIUS = 12

type PointLike = { x?: number; y?: number } | null | undefined

function isValidPoint(p: PointLike): p is { x: number; y: number } {
  return p != null && Number.isFinite(p.x) && Number.isFinite(p.y)
}

function resolveAdjustEndpoint(primary: PointLike, fallback: PointLike): { x: number; y: number } {
  if (isValidPoint(primary)) return { x: primary.x, y: primary.y }
  if (isValidPoint(fallback)) return { x: fallback.x, y: fallback.y }
  return { x: 0, y: 0 }
}

function renderEdgeWithHoverAdjust(view: InstanceType<EdgeViewCtor>): ReturnType<typeof h> {
  const { model } = view.props as {
    model: {
      isSelected: boolean
      isHovered: boolean
      isHitable: boolean
      isShowAdjustPoint: boolean
    }
  }
  const showAdjust = Boolean(model.isShowAdjustPoint && (model.isSelected || model.isHovered))
  const edge = view as InstanceType<EdgeViewCtor> & {
    handleClick: (e: MouseEvent) => void
    handleContextMenu: (e: MouseEvent) => void
    handleMouseDown: (e: PointerEvent) => void
    handleMouseUp: (e: PointerEvent) => void
    setHoverOn: (e: MouseEvent) => void
    setHoverOff: (e: MouseEvent) => void
    handleFocus: (e: FocusEvent) => void
    handleBlur: (e: FocusEvent) => void
    getShape: () => ReturnType<typeof h>
    getAppend: () => ReturnType<typeof h>
    getText: () => ReturnType<typeof h> | null
    getArrow: () => ReturnType<typeof h>
    getAdjustPoints: () => ReturnType<typeof h>
  }

  return h(
    'g',
    {
      className: [
        'dg-edge-root',
        model.isHovered && 'dg-edge-root--hover',
        model.isSelected && 'dg-edge-root--selected'
      ]
        .filter(Boolean)
        .join(' '),
      onMouseEnter: edge.setHoverOn.bind(edge),
      onMouseLeave: edge.setHoverOff.bind(edge)
    },
    [
      h(
        'g',
        {
          className: ['lf-edge', !model.isHitable && 'pointer-none', model.isSelected && 'lf-edge-selected']
            .filter(Boolean)
            .join(' '),
          style: {
            touchAction: 'none',
            WebkitTouchCallout: 'none'
          },
          onClick: edge.handleClick.bind(edge),
          onContextMenu: edge.handleContextMenu.bind(edge),
          onPointerDown: edge.handleMouseDown.bind(edge),
          onPointerUp: edge.handleMouseUp.bind(edge),
          onPointerCancel: edge.handleMouseUp.bind(edge),
          onFocus: edge.handleFocus.bind(edge),
          onBlur: edge.handleBlur.bind(edge)
        },
        [edge.getShape(), edge.getAppend(), edge.getText(), edge.getArrow()]
      ),
      showAdjust ? edge.getAdjustPoints() : null
    ]
  )
}

function createHoverAdjustEdgeView(Base: EdgeViewCtor): EdgeViewCtor {
  return class DiagramHoverAdjustEdge extends Base {
    getAdjustPoints() {
      const { model, graphModel } = this.props as {
        model: {
          getAdjustStart: () => PointLike
          getAdjustEnd: () => PointLike
          startPoint: { x: number; y: number }
          endPoint: { x: number; y: number }
        }
        graphModel: {
          editConfigModel: {
            adjustEdgeStartAndEnd: boolean
            adjustEdgeStart: boolean
            adjustEdgeEnd: boolean
          }
        }
      }
      const { adjustEdgeStartAndEnd, adjustEdgeStart, adjustEdgeEnd } = graphModel.editConfigModel
      const shapeFn = this.getAdjustPointShape.bind(this)
      const start = resolveAdjustEndpoint(model.getAdjustStart(), model.startPoint)
      const end = resolveAdjustEndpoint(model.getAdjustEnd(), model.endPoint)
      const children: ReturnType<typeof h>[] = []

      if (adjustEdgeStartAndEnd && adjustEdgeStart) {
        children.push(
          h(AdjustPoint, {
            type: AdjustType.SOURCE,
            x: start.x,
            y: start.y,
            getAdjustPointShape: shapeFn,
            edgeModel: model,
            graphModel
          })
        )
      }
      if (adjustEdgeStartAndEnd && adjustEdgeEnd) {
        children.push(
          h(AdjustPoint, {
            type: AdjustType.TARGET,
            x: end.x,
            y: end.y,
            getAdjustPointShape: shapeFn,
            edgeModel: model,
            graphModel
          })
        )
      }
      return h('g', {}, children)
    }

    getAdjustPointShape(x: number, y: number, model: { getAdjustPointStyle: () => Record<string, unknown> }) {
      const cx = Number.isFinite(x) ? x : 0
      const cy = Number.isFinite(y) ? y : 0
      const style = model.getAdjustPointStyle()
      const dotR = Number(style.r) || 5
      return h('g', { className: 'dg-edge-adjust-point' }, [
        h('circle', {
          className: 'dg-edge-adjust-point__hit',
          cx,
          cy,
          r: ADJUST_HIT_RADIUS,
          fill: 'transparent',
          stroke: 'none'
        }),
        h('circle', {
          className: 'lf-edge-adjust-point dg-edge-adjust-point__dot',
          cx,
          cy,
          r: dotR,
          fill: style.fill as string | undefined,
          stroke: style.stroke as string | undefined,
          strokeWidth: style.strokeWidth as number | undefined
        })
      ])
    }

    render() {
      return renderEdgeWithHoverAdjust(this)
    }
  }
}

export const DiagramPolylineEdge = createHoverAdjustEdgeView(PolylineEdge)
export const DiagramLineEdge = createHoverAdjustEdgeView(LineEdge)
export const DiagramBezierEdge = createHoverAdjustEdgeView(BezierEdge)
