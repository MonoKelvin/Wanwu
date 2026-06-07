import { DiamondNode, EllipseNode } from '@logicflow/core'
import { DiamondResizeModel } from '@logicflow/extension/lib/NodeResize/node/DiamondResize'
import { EllipseResizeModel } from '@logicflow/extension/lib/NodeResize/node/EllipseResize'
import { RectResizeModel, RectResizeView } from '@logicflow/extension/lib/NodeResize/node/RectResize'
import { diagramGetResizeControl } from '@modules/library/diagrams/lib/diagramResizeControls'
import {
  diagramResizeControlStyle,
  diagramResizeOutlineStyle,
  syncNodeSizeProperties
} from '@modules/library/diagrams/lib/diagramShapeResize'
import { buildDiagramNodeTextStyle, syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'

export { diagramResizeOutlineStyle } from '@modules/library/diagrams/lib/diagramShapeResize'

/** 矩形类图元 Model */
export class DiagramRectResizeModel extends RectResizeModel {
  getTextStyle() {
    return buildDiagramNodeTextStyle(this)
  }

  getResizeControlStyle() {
    return diagramResizeControlStyle()
  }

  getResizeOutlineStyle() {
    return diagramResizeOutlineStyle()
  }

  resize(resizeInfo: Parameters<RectResizeModel['resize']>[0]) {
    const data = super.resize(resizeInfo)
    syncNodeSizeProperties(this)
    syncNodeTextLayout(this)
    return data
  }
}

/** 椭圆/圆图元 Model（含自动换行） */
export class DiagramEllipseResizeModel extends EllipseResizeModel {
  getTextStyle() {
    return buildDiagramNodeTextStyle(this)
  }

  resize(resizeInfo: Parameters<EllipseResizeModel['resize']>[0]) {
    const data = super.resize(resizeInfo)
    syncNodeSizeProperties(this)
    syncNodeTextLayout(this)
    return data
  }
}

/** 菱形图元 Model（含自动换行） */
export class DiagramDiamondResizeModel extends DiamondResizeModel {
  getTextStyle() {
    return buildDiagramNodeTextStyle(this)
  }

  resize(resizeInfo: Parameters<DiamondResizeModel['resize']>[0]) {
    const data = super.resize(resizeInfo)
    syncNodeSizeProperties(this)
    syncNodeTextLayout(this)
    return data
  }
}

/** 矩形类图元 View */
export class DiagramRectResizeView extends RectResizeView {
  getResizeControl() {
    const { model, graphModel } = this.props
    return diagramGetResizeControl(model, graphModel)
  }
}

/** 椭圆/圆图元 View */
export class DiagramResizableEllipseView extends EllipseNode {
  getResizeControl() {
    const { model, graphModel } = this.props
    return diagramGetResizeControl(model, graphModel)
  }
}

/** 菱形图元 View */
export class DiagramResizableDiamondView extends DiamondNode {
  getResizeControl() {
    const { model, graphModel } = this.props
    return diagramGetResizeControl(model, graphModel)
  }
}
