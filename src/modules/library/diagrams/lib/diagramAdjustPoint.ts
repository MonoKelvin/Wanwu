import {
  AdjustPoint,
  AdjustType,
  ElementState,
  EventType,
  StepDrag
} from '@logicflow/core'
import type { IDragParams } from '@logicflow/core/es/util/drag'
import {
  resolveDiagramAdjustDropCanvasPoint,
  resolveDiagramAdjustDropTarget
} from '@modules/library/diagrams/lib/diagramEdgeAdjustDrop'

/** 端点拖到画布空白处松手时删除连线，而非 LogicFlow 默认的还原 */
export class DiagramAdjustPoint extends AdjustPoint {
  constructor(props: ConstructorParameters<typeof AdjustPoint>[0]) {
    super(props)

    const { graphModel } = props
    this.stepDrag.destroy()
    this.stepDrag = new StepDrag({
      onDragStart: this.onDragStart.bind(this),
      onDragging: this.onDragging.bind(this),
      onDragEnd: this.onDiagramAdjustDragEnd.bind(this),
      eventType: 'ADJUST_POINT',
      isStopPropagation: false,
      eventCenter: graphModel.eventCenter,
      data: this.stepDragData
    })
  }

  private onDiagramAdjustDragEnd({ event }: Partial<IDragParams>): void {
    const wasDragging = this.state.dragging
    const { endX, endY } = this.state
    this.setState({ dragging: false })

    try {
      if (!wasDragging) return

      const { graphModel, edgeModel, type } = this.props
      const dropPoint = resolveDiagramAdjustDropCanvasPoint(
        graphModel,
        { x: endX, y: endY },
        event
      )
      const info = resolveDiagramAdjustDropTarget(graphModel, dropPoint)

      let needRecoveryEdge = false
      let deleteOnBlank = false
      let createEdgeInfo: Record<string, unknown> | undefined

      if (info) {
        const { pass, msg, newTargetNode } = this.isAllowAdjust(info)
        if (pass) {
          const {
            text,
            sourceAnchorId = '',
            targetAnchorId = '',
            ...rest
          } = edgeModel.getData()
          createEdgeInfo = {
            sourceAnchorId,
            targetAnchorId,
            ...rest,
            text: text?.value || ''
          }

          if (type === AdjustType.SOURCE) {
            const sourceNode = graphModel.getNodeModelById(info.node.id)
            const targetNode = graphModel.getNodeModelById(edgeModel.targetNodeId)
            const sourceData = sourceNode?.getData()
            const targetData = targetNode?.getData()
            if (!sourceData || !targetData) {
              needRecoveryEdge = true
            } else {
              const edgeInfo = graphModel.edgeGenerator?.(sourceData, targetData, createEdgeInfo)
              createEdgeInfo = {
                ...edgeInfo,
                sourceNodeId: info.node.id,
                sourceAnchorId: info.anchor.id,
                startPoint: { x: info.anchor.x, y: info.anchor.y },
                targetNodeId: edgeModel.targetNodeId,
                endPoint: { ...edgeModel.endPoint }
              }
              if (
                edgeModel.sourceNodeId === info.node.id &&
                edgeModel.sourceAnchorId === info.anchor.id
              ) {
                needRecoveryEdge = true
              }
            }
          } else if (type === AdjustType.TARGET) {
            const sourceNode = graphModel.getNodeModelById(edgeModel.sourceNodeId)
            const targetNode = graphModel.getNodeModelById(info.node.id)
            const sourceData = sourceNode?.getData()
            const targetData = targetNode?.getData()
            if (!sourceData || !targetData) {
              needRecoveryEdge = true
            } else {
              const edgeInfo = graphModel.edgeGenerator?.(sourceData, targetData, createEdgeInfo)
              createEdgeInfo = {
                ...edgeInfo,
                sourceNodeId: edgeModel.sourceNodeId,
                startPoint: { ...edgeModel.startPoint },
                targetNodeId: info.node.id,
                targetAnchorId: info.anchor.id,
                endPoint: { x: info.anchor.x, y: info.anchor.y }
              }
              if (
                edgeModel.targetNodeId === info.node.id &&
                edgeModel.targetAnchorId === info.anchor.id
              ) {
                needRecoveryEdge = true
              }
            }
          }
        } else {
          needRecoveryEdge = true
          graphModel.eventCenter.emit(EventType.CONNECTION_NOT_ALLOWED, {
            data: newTargetNode.getData(),
            msg
          })
        }
      } else {
        deleteOnBlank = true
        graphModel.deleteEdgeById(edgeModel.id)
      }

      if (deleteOnBlank) {
        // 空白松手已删除
      } else if (!needRecoveryEdge && createEdgeInfo) {
        const oldEdgeData = edgeModel.getData()
        graphModel.deleteEdgeById(edgeModel.id)
        const edge = graphModel.addEdge(createEdgeInfo as unknown as Parameters<typeof graphModel.addEdge>[0])
        graphModel.eventCenter.emit(EventType.EDGE_EXCHANGE_NODE, {
          data: {
            newEdge: edge.getData(),
            oldEdge: oldEdgeData
          }
        })
      } else {
        this.recoveryEdge()
      }

      this.preTargetNode?.setElementState(ElementState.DEFAULT)
    } finally {
      this.props.graphModel.eventCenter.emit(EventType.ADJUST_POINT_DRAGEND, {
        e: event,
        data: this.stepDragData
      })
    }
  }
}
