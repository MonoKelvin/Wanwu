import { h, BezierEdge, LineEdge, PolylineEdge } from '@logicflow/core'
import {
  edgeAdjustHitShape,
  renderEdgeAdjustLayer
} from '@modules/library/diagrams/lib/diagramEdgeAdjustPoint'

type EdgeViewCtor = typeof PolylineEdge | typeof LineEdge | typeof BezierEdge

type DiagramEdgeViewLike = {
  props: {
    model: {
      isSelected: boolean
      isHovered: boolean
      isHitable: boolean
      isShowAdjustPoint: boolean
    }
  }
  handleClick: (e: MouseEvent) => void
  handleContextMenu: (e: MouseEvent) => void
  handleMouseDown: (e: PointerEvent) => void
  handleMouseUp: (e: PointerEvent) => void
  handleFocus: (e: FocusEvent) => void
  handleBlur: (e: FocusEvent) => void
  getShape: () => ReturnType<typeof h>
  getAppend: () => ReturnType<typeof h>
  getText: () => ReturnType<typeof h> | null
  getArrow: () => ReturnType<typeof h>
  getAdjustPoints: () => ReturnType<typeof h>
}

function renderEdgeWithHoverAdjust(view: DiagramEdgeViewLike) {
  const { model } = view.props
  const showAdjust = Boolean(model.isShowAdjustPoint && (model.isSelected || model.isHovered))

  return h(
    'g',
    {
      className: [
        'dg-edge-root',
        model.isHovered && 'dg-edge-root--hover',
        model.isSelected && 'dg-edge-root--selected'
      ]
        .filter(Boolean)
        .join(' ')
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
          onClick: view.handleClick.bind(view),
          onContextMenu: view.handleContextMenu.bind(view),
          onPointerDown: view.handleMouseDown.bind(view),
          onPointerUp: view.handleMouseUp.bind(view),
          onPointerCancel: view.handleMouseUp.bind(view),
          onFocus: view.handleFocus.bind(view),
          onBlur: view.handleBlur.bind(view)
        },
        [view.getShape(), view.getAppend(), view.getText(), view.getArrow()]
      ),
      showAdjust ? view.getAdjustPoints() : null
    ]
  ) as ReturnType<typeof h>
}

function createHoverAdjustEdgeView<T extends EdgeViewCtor>(Base: T): T {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const DiagramHoverAdjustEdge = class extends (Base as any) {
    getAdjustPoints() {
      const { model, graphModel } = this.props as {
        model: Parameters<typeof renderEdgeAdjustLayer>[0]
        graphModel: Parameters<typeof renderEdgeAdjustLayer>[1]
      }
      return renderEdgeAdjustLayer(model, graphModel, (x, y) => edgeAdjustHitShape(x, y))
    }

    getAdjustPointShape(x: number, y: number, _edgeModel?: unknown) {
      return edgeAdjustHitShape(x, y)
    }

    render() {
      return renderEdgeWithHoverAdjust(this as unknown as DiagramEdgeViewLike)
    }
  }
  return DiagramHoverAdjustEdge as unknown as T
}

export const DiagramPolylineEdge = createHoverAdjustEdgeView(PolylineEdge)
export const DiagramLineEdge = createHoverAdjustEdgeView(LineEdge)
export const DiagramBezierEdge = createHoverAdjustEdgeView(BezierEdge)
