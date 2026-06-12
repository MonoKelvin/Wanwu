import LogicFlow, { BaseNodeModel, Component, GraphModel, h, observer, Rect } from '@logicflow/core'
import { StepDrag } from '@logicflow/core/lib/util/drag'
import { getNodeBBox } from '@logicflow/core/lib/util/node'
import { handleResize } from '@logicflow/core/lib/util/resize'
import {
  diagramResizeControlStyle,
  diagramResizeOutlineStyle
} from '@modules/library/diagrams/lib/diagramShapeResize'
import { shouldShowSingleNodeResize } from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import {
  boundsForResizeHandleDrag,
  cornerOfSelectionRect,
  selectionRectFromBBox,
  type DiagramResizeHandleDir
} from '@modules/library/diagrams/lib/diagramResizeBounds'
import type { DiagramSelectionRect } from '@modules/library/diagrams/lib/diagramNodeLayout'

type HandleDir = DiagramResizeHandleDir

const HANDLE_INDEX: Record<HandleDir, number> = {
  nw: 0,
  ne: 1,
  se: 2,
  sw: 3
}

function cornerPoint(
  dir: HandleDir,
  model: BaseNodeModel
): { x: number; y: number } {
  const { minX, minY, maxX, maxY } = getNodeBBox(model)
  switch (dir) {
    case 'nw':
      return { x: minX, y: minY }
    case 'ne':
      return { x: maxX, y: minY }
    case 'se':
      return { x: maxX, y: maxY }
    case 'sw':
      return { x: minX, y: maxY }
  }
}

function handleViewPos(dir: HandleDir, cornerX: number, cornerY: number, w: number, h: number) {
  switch (dir) {
    case 'nw':
      return { x: cornerX - w / 2, y: cornerY - h / 2 }
    case 'ne':
      return { x: cornerX + w / 2, y: cornerY - h / 2 }
    case 'se':
      return { x: cornerX + w / 2, y: cornerY + h / 2 }
    case 'sw':
      return { x: cornerX - w / 2, y: cornerY + h / 2 }
  }
}

/** 单角缩放锚点：可见方块 + 更大透明热区，使用 onPointerDown + core handleResize */
class DiagramResizeHandleInner extends Component {
  private index = 0
  private nodeModel!: BaseNodeModel
  private graphModel!: GraphModel
  private dragHandler!: StepDrag
  private direction: HandleDir = 'nw'
  private dragStartBounds: DiagramSelectionRect | null = null
  private cumDx = 0
  private cumDy = 0

  constructor(props: Record<string, unknown>) {
    super(props)
    this.direction = props.direction as HandleDir
    this.index = HANDLE_INDEX[this.direction]
    this.nodeModel = props.model as BaseNodeModel
    this.graphModel = props.graphModel as GraphModel
    this.dragHandler = new StepDrag({
      onDragStart: () => {
        if (shouldShowSingleNodeResize(this.graphModel, this.nodeModel)) {
          this.graphModel.selectNodeById(this.nodeModel.id)
        }
        this.dragStartBounds = selectionRectFromBBox(getNodeBBox(this.nodeModel))
        this.cumDx = 0
        this.cumDy = 0
      },
      onDragging: ({ deltaX, deltaY }) => {
        const { nodeModel, graphModel, direction } = this
        const [cdx, cdy] = graphModel.transformModel.fixDeltaXY(deltaX, deltaY)
        const start = this.dragStartBounds
        if (!start) {
          const { x, y } = cornerPoint(direction, nodeModel)
          handleResize({
            x,
            y,
            deltaX,
            deltaY,
            index: this.index,
            nodeModel,
            graphModel
          })
          return
        }

        const tryDx = this.cumDx + cdx
        const tryDy = this.cumDy + cdy
        const next = boundsForResizeHandleDrag(direction, start, tryDx, tryDy, false, {
          minWidth: nodeModel.minWidth,
          minHeight: nodeModel.minHeight,
          maxWidth: nodeModel.maxWidth,
          maxHeight: nodeModel.maxHeight
        })
        if (!next) return

        this.cumDx = tryDx
        this.cumDy = tryDy

        const corner = cornerPoint(direction, nodeModel)
        const target = cornerOfSelectionRect(direction, next)
        handleResize({
          x: corner.x,
          y: corner.y,
          deltaX: target.x - corner.x,
          deltaY: target.y - corner.y,
          index: this.index,
          nodeModel,
          graphModel
        })
      },
      onDragEnd: () => {
        this.dragStartBounds = null
        this.cumDx = 0
        this.cumDy = 0
      },
      step: 1
    })
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!shouldShowSingleNodeResize(this.graphModel, this.nodeModel)) {
      return
    }
    e.stopPropagation()
    e.preventDefault()
    this.dragHandler.handleMouseDown(e)
  }

  render() {
    const { direction, model } = this.props as {
      direction: HandleDir
      model: BaseNodeModel
    }
    const { x: cornerX, y: cornerY } = cornerPoint(direction, model)
    const style = model.getResizeControlStyle()
    const w = Number(style.width ?? 8)
    const ht = Number(style.height ?? 8)
    const hit = Math.max(w, ht) + 10
    const { x, y } = handleViewPos(direction, cornerX, cornerY, w, ht)

    return h('g', { className: `dg-resize-handle dg-resize-handle--${direction}` }, [
      h(Rect, {
        className: 'dg-resize-handle__dot',
        x,
        y,
        width: w,
        height: ht,
        radius: 1,
        fill: style.fill,
        stroke: style.stroke,
        strokeWidth: 1
      }),
      h(Rect, {
        className: 'dg-resize-handle__hit',
        x,
        y,
        width: hit,
        height: hit,
        fill: 'transparent',
        stroke: 'transparent',
        onPointerDown: this.onPointerDown
      })
    ])
  }
}

class DiagramResizeControlGroupInner extends Component {
  render() {
    const { model, graphModel } = this.props as {
      model: BaseNodeModel & { x: number; y: number; width: number; height: number }
      graphModel: GraphModel
    }
    const outline = model.getResizeOutlineStyle()
    const dirs: HandleDir[] = ['nw', 'ne', 'se', 'sw']

    return h('g', { className: 'dg-resize-group' }, [
      h(Rect, {
        className: 'dg-resize-outline',
        x: model.x,
        y: model.y,
        width: model.width,
        height: model.height,
        radius: Number(outline.radius ?? 4),
        fill: 'none',
        stroke: String(outline.stroke ?? '#9a9aa2'),
        strokeWidth: Number(outline.strokeWidth ?? 1),
        strokeDasharray: String(outline.strokeDasharray ?? '4,4')
      }),
      ...dirs.map((dir) =>
        h(DiagramResizeHandle as never, {
          key: dir,
          direction: dir,
          model,
          graphModel
        })
      )
    ])
  }
}

/** mobx observer：model 宽高变化时实时重绘锚点与虚线框 */
const DiagramResizeHandle = observer(DiagramResizeHandleInner)
const DiagramResizeControlGroup = observer(DiagramResizeControlGroupInner)

/** 供各图元 View 覆盖 getResizeControl() 使用 */
export function diagramGetResizeControl(
  model: BaseNodeModel,
  graphModel: GraphModel
) {
  const { isSilentMode, allowResize } = graphModel.editConfigModel
  if (
    isSilentMode ||
    !allowResize ||
    !model.resizable ||
    !shouldShowSingleNodeResize(graphModel, model)
  ) {
    return null
  }
  return h(DiagramResizeControlGroup as never, { model, graphModel })
}

export { diagramResizeControlStyle, diagramResizeOutlineStyle }
