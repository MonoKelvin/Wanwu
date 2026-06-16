import LogicFlow, { BaseNodeModel, Component, GraphModel, h, observer, Rect } from '@logicflow/core'
import { StepDrag } from '@logicflow/core/lib/util/drag'
import { getNodeBBox } from '@logicflow/core/lib/util/node'
import { handleResize } from '@logicflow/core/lib/util/resize'
import { getDiagramCanvasSnapGrid, getDiagramActiveLogicFlow } from '@modules/library/diagrams/lib/diagramCanvasInteractionSettings'
import { snapResizeTargetBounds } from '@modules/library/diagrams/lib/diagramDragSnap'
import { isDiagramSnapBypassActive } from '@modules/library/diagrams/lib/diagramSnapBypass'
import {
  diagramResizeControlStyle,
  diagramResizeOutlineStyle
} from '@modules/library/diagrams/lib/diagramShapeResize'
import { shouldShowSingleNodeResize } from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import type { DiagramResizeHandleDir } from '@modules/library/diagrams/lib/diagramResizeBounds'
import {
  cornerOfSelectionRect,
  fixedAnchorForResizeHandle,
  selectionRectFromBBox,
  targetBoundsFromResizePointer
} from '@modules/library/diagrams/lib/diagramResizeBounds'
import {
  beginDiagramResizeSession,
  endDiagramResizeSession
} from '@modules/library/diagrams/lib/diagramResizeSession'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'

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

function handleViewPos(
  dir: HandleDir,
  cornerX: number,
  cornerY: number,
  w: number,
  h: number,
  inset = 0
) {
  switch (dir) {
    case 'nw':
      return { x: cornerX - w / 2 + inset, y: cornerY - h / 2 + inset }
    case 'ne':
      return { x: cornerX + w / 2 - inset, y: cornerY - h / 2 + inset }
    case 'se':
      return { x: cornerX + w / 2 - inset, y: cornerY + h / 2 - inset }
    case 'sw':
      return { x: cornerX - w / 2 + inset, y: cornerY + h / 2 - inset }
  }
}

const DEFAULT_HANDLE_DIRS: HandleDir[] = ['nw', 'ne', 'se', 'sw']

function resolveResizePolicy(model: BaseNodeModel): { handles: HandleDir[]; handleInset: number } {
  const kindReg = ensureDiagramShapeExtensions().getKindByLfType(String(model.type ?? ''))
  const policy = kindReg?.resizePolicy
  const handles = policy?.handles?.length ? ([...policy.handles] as HandleDir[]) : DEFAULT_HANDLE_DIRS
  return { handles, handleInset: policy?.handleInset ?? 0 }
}

/** 单角缩放锚点：可见方块 + 更大透明热区，使用 onPointerDown + core handleResize */
class DiagramResizeHandleInner extends Component {
  private index = 0
  private nodeModel!: BaseNodeModel
  private graphModel!: GraphModel
  private dragHandler!: StepDrag
  private direction: HandleDir = 'nw'
  private fixedAnchor: { x: number; y: number } | null = null

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
        const startRect = selectionRectFromBBox(getNodeBBox(this.nodeModel))
        this.fixedAnchor = fixedAnchorForResizeHandle(this.direction, startRect)
        beginDiagramResizeSession(this.nodeModel.id, this.index, this.fixedAnchor)
      },
      onDragging: ({ event }) => {
        const { nodeModel, graphModel, direction } = this
        const fixed = this.fixedAnchor
        if (!fixed || !event) return

        const pointer = graphModel.getPointByClient({
          x: event.clientX,
          y: event.clientY
        }).canvasOverlayPosition
        let target = targetBoundsFromResizePointer(
          direction,
          fixed,
          pointer.x,
          pointer.y,
          {
            minWidth: nodeModel.minWidth,
            minHeight: nodeModel.minHeight,
            maxWidth: nodeModel.maxWidth,
            maxHeight: nodeModel.maxHeight
          }
        )
        if (!isDiagramSnapBypassActive()) {
          const lf = getDiagramActiveLogicFlow()
          if (lf) {
            target = snapResizeTargetBounds(
              lf,
              nodeModel.id,
              this.index,
              target,
              getDiagramCanvasSnapGrid()
            )
          }
        }
        const corner = cornerPoint(direction, nodeModel)
        const targetCorner = cornerOfSelectionRect(direction, target)
        handleResize({
          x: corner.x,
          y: corner.y,
          deltaX: targetCorner.x - corner.x,
          deltaY: targetCorner.y - corner.y,
          index: this.index,
          nodeModel,
          graphModel
        })
      },
      onDragEnd: () => {
        endDiagramResizeSession()
        this.fixedAnchor = null
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
    const { direction, model, handleInset = 0 } = this.props as {
      direction: HandleDir
      model: BaseNodeModel
      handleInset?: number
    }
    const { x: cornerX, y: cornerY } = cornerPoint(direction, model)
    const style = model.getResizeControlStyle()
    const w = Number(style.width ?? 8)
    const ht = Number(style.height ?? 8)
    const hit = Math.max(w, ht) + 10
    const { x, y } = handleViewPos(direction, cornerX, cornerY, w, ht, handleInset)

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
    const { model, graphModel, handles, handleInset } = this.props as {
      model: BaseNodeModel & { x: number; y: number; width: number; height: number }
      graphModel: GraphModel
      handles: HandleDir[]
      handleInset: number
    }
    const outline = model.getResizeOutlineStyle()

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
      ...handles.map((dir) =>
        h(DiagramResizeHandle as never, {
          key: dir,
          direction: dir,
          model,
          graphModel,
          handleInset
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
  const { handles, handleInset } = resolveResizePolicy(model)
  return h(DiagramResizeControlGroup as never, { model, graphModel, handles, handleInset })
}

export { diagramResizeControlStyle, diagramResizeOutlineStyle }
