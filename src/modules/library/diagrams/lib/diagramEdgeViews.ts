import { h, BezierEdge, LineEdge, PolylineEdge } from '@logicflow/core'

type EdgeViewCtor = typeof PolylineEdge

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

  return h('g', {}, [
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
        onMouseOver: edge.setHoverOn.bind(edge),
        onMouseEnter: edge.setHoverOn.bind(edge),
        onMouseLeave: edge.setHoverOff.bind(edge),
        onFocus: edge.handleFocus.bind(edge),
        onBlur: edge.handleBlur.bind(edge)
      },
      [edge.getShape(), edge.getAppend(), edge.getText(), edge.getArrow()]
    ),
    showAdjust ? edge.getAdjustPoints() : null
  ])
}

function createHoverAdjustEdgeView(Base: EdgeViewCtor): EdgeViewCtor {
  return class DiagramHoverAdjustEdge extends Base {
    render() {
      return renderEdgeWithHoverAdjust(this)
    }
  }
}

export const DiagramPolylineEdge = createHoverAdjustEdgeView(PolylineEdge)
export const DiagramLineEdge = createHoverAdjustEdgeView(LineEdge)
export const DiagramBezierEdge = createHoverAdjustEdgeView(BezierEdge)
