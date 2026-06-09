import LogicFlow, {
  BaseEdgeModel,
  BezierEdgeModel,
  h,
  LineEdgeModel,
  PolylineEdgeModel
} from '@logicflow/core'
import {
  DiagramBezierEdge,
  DiagramLineEdge,
  DiagramPolylineEdge
} from '@modules/library/diagrams/lib/diagramEdgeViews'
import { DiamondResizeModel } from '@logicflow/extension/lib/NodeResize/node/DiamondResize'
import { EllipseResizeModel } from '@logicflow/extension/lib/NodeResize/node/EllipseResize'
import {
  DiagramDiamondResizeModel,
  DiagramEllipseResizeModel,
  DiagramRectResizeModel,
  DiagramRectResizeView,
  DiagramResizableDiamondView,
  DiagramResizableEllipseView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import {
  applyDefaultEllipseRadii,
  applyDefaultRectSize,
  centerPolygonPoints,
  diagramNodeShapeAttrs,
  diagramResizeControlStyle,
  diagramResizeOutlineStyle,
  hasPersistedNodeSize,
  resolvePolygonGeometry,
  syncNodeSizeProperties,
  type PolyPoint
} from '@modules/library/diagrams/lib/diagramShapeResize'
import { registerDiagramGroupFrame } from '@modules/library/diagrams/lib/diagramGroupFrame'

type Point = PolyPoint

function regPolygon(lf: LogicFlow, type: string, points: Point[]) {
  const template = centerPolygonPoints(points)
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      const geo = resolvePolygonGeometry(data, points)
      this.properties = {
        ...this.properties,
        dgPolyPoints: geo.points,
        dgPolyBasisW: geo.basisW,
        dgPolyBasisH: geo.basisH,
        dgPolyCentered: true
      }
      if (!hasPersistedNodeSize(data)) {
        this.width = template.width
        this.height = template.height
      }
      this.minWidth = 20
      this.minHeight = 20
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, properties } = model
      const style = model.getNodeStyle()
      const orig = (properties.dgPolyPoints ?? template.points) as Point[]
      const bw = Number(properties.dgPolyBasisW ?? template.width)
      const bh = Number(properties.dgPolyBasisH ?? template.height)
      const sx = width / bw
      const sy = height / bh
      const pts = orig.map(([px, py]) => `${x + px * sx},${y + py * sy}`).join(' ')
      return h('g', {}, [
        h('polygon', {
          points: pts,
          ...diagramNodeShapeAttrs(style)
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

function regRect(lf: LogicFlow, type: string, width: number, height: number, radius = 0) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width, height, radius })
      this.minWidth = 24
      this.minHeight = 24
    }
  }
  class View extends DiagramRectResizeView {}
  lf.register({ type, view: View, model: Model })
}

function regCircle(lf: LogicFlow, type: string, r: number) {
  class Model extends DiagramEllipseResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultEllipseRadii(this, data, { rx: r, ry: r })
      this.minWidth = 16
      this.minHeight = 16
    }
    getResizeControlStyle() {
      return diagramResizeControlStyle()
    }
    getResizeOutlineStyle() {
      return diagramResizeOutlineStyle()
    }
    resize(resizeInfo: Parameters<EllipseResizeModel['resize']>[0]) {
      const data = super.resize(resizeInfo)
      syncNodeSizeProperties(this)
      return data
    }
  }
  class View extends DiagramResizableEllipseView {}
  lf.register({ type, view: View, model: Model })
}

function regEllipse(lf: LogicFlow, type: string, rx: number, ry: number) {
  class Model extends DiagramEllipseResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultEllipseRadii(this, data, { rx, ry })
      this.minWidth = 20
      this.minHeight = 16
    }
    getResizeControlStyle() {
      return diagramResizeControlStyle()
    }
    getResizeOutlineStyle() {
      return diagramResizeOutlineStyle()
    }
    resize(resizeInfo: Parameters<EllipseResizeModel['resize']>[0]) {
      const data = super.resize(resizeInfo)
      syncNodeSizeProperties(this)
      return data
    }
  }
  class View extends DiagramResizableEllipseView {}
  lf.register({ type, view: View, model: Model })
}

function regDiamond(lf: LogicFlow, type: string, rx: number, ry: number) {
  class Model extends DiagramDiamondResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultEllipseRadii(this, data, { rx, ry })
      this.minWidth = 24
      this.minHeight = 24
    }
    getResizeControlStyle() {
      return diagramResizeControlStyle()
    }
    getResizeOutlineStyle() {
      return diagramResizeOutlineStyle()
    }
    resize(resizeInfo: Parameters<DiamondResizeModel['resize']>[0]) {
      const data = super.resize(resizeInfo)
      syncNodeSizeProperties(this)
      return data
    }
  }
  class View extends DiagramResizableDiamondView {}
  lf.register({ type, view: View, model: Model })
}

/** 文档：折角矩形 */
function regDocument(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 100, height: 72, radius: 2 })
      this.minWidth = 40
      this.minHeight = 32
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const l = x - width / 2
      const t = y - height / 2
      const r = x + width / 2
      const b = y + height / 2
      const fold = 14
      const d = `M ${l} ${t} H ${r - fold} L ${r} ${t + fold} V ${b} H ${l} Z`
      return h('g', {}, [h('path', { d, ...diagramNodeShapeAttrs(style) })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 子流程：双侧竖线 */
function regSubprocess(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 120, height: 52, radius: 4 })
      this.minWidth = 48
      this.minHeight = 32
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, radius } = model
      const style = model.getNodeStyle()
      const inset = 10
      return h('g', {}, [
        h('rect', {
          ...style,
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          rx: radius,
          ry: radius
        }),
        h('line', {
          x1: x - width / 2 + inset,
          y1: y - height / 2 + 6,
          x2: x - width / 2 + inset,
          y2: y + height / 2 - 6,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        }),
        h('line', {
          x1: x + width / 2 - inset,
          y1: y - height / 2 + 6,
          x2: x + width / 2 - inset,
          y2: y + height / 2 - 6,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 多文档：叠放 */
function regMultiDocument(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 100, height: 72 })
      this.minWidth = 40
      this.minHeight = 32
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const w = width
      const hgt = height
      const drawDoc = (ox: number, oy: number) => {
        const l = x - w / 2 + ox
        const t = y - hgt / 2 + oy
        const r = l + w - 8
        const b = t + hgt - 8
        const fold = 12
        const d = `M ${l} ${t} H ${r - fold} L ${r} ${t + fold} V ${b} H ${l} Z`
        return h('path', { d, ...diagramNodeShapeAttrs(style) })
      }
      return h('g', {}, [drawDoc(6, 6), drawDoc(0, 0)])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 延迟：D 形 */
function regDelay(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 100, height: 52 })
      this.minWidth = 40
      this.minHeight = 28
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const l = x - width / 2
      const t = y - height / 2
      const r = x + width / 2
      const b = y + height / 2
      const cy = y
      const d = `M ${l} ${t} H ${x} A ${height / 2} ${height / 2} 0 0 1 ${x} ${b} H ${l} Z`
      return h('g', {}, [h('path', { d, ...diagramNodeShapeAttrs(style) })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 存储：圆柱 */
function regStoredData(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 88, height: 56 })
      this.minWidth = 36
      this.minHeight = 32
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const l = x - width / 2
      const r = x + width / 2
      const t = y - height / 2 + 8
      const b = y + height / 2
      const rx = width / 2
      const d = `M ${l} ${t} A ${rx} 8 0 0 1 ${r} ${t} V ${b - 8} A ${rx} 8 0 0 1 ${l} ${b - 8} Z`
      return h('g', {}, [
        h('path', { d, ...diagramNodeShapeAttrs(style) }),
        h('ellipse', {
          cx: x,
          cy: t,
          rx,
          ry: 8,
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 注释：左侧强调线 */
function regComment(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 108, height: 48, radius: 4 })
      this.minWidth = 48
      this.minHeight = 28
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, radius } = model
      const style = model.getNodeStyle()
      return h('g', {}, [
        h('rect', {
          ...style,
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          rx: radius,
          ry: radius
        }),
        h('line', {
          x1: x - width / 2 + 4,
          y1: y - height / 2 + 8,
          x2: x - width / 2 + 4,
          y2: y + height / 2 - 8,
          stroke: style.stroke,
          strokeWidth: (style.strokeWidth as number) + 1.5
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 泳道 */
function regSwimlane(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 200, height: 120, radius: 4 })
      this.minWidth = 80
      this.minHeight = 48
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, radius } = model
      const style = model.getNodeStyle()
      const top = y - height / 2
      const band = Math.min(28, height * 0.22)
      return h('g', {}, [
        h('rect', {
          ...style,
          x: x - width / 2,
          y: top,
          width,
          height,
          rx: radius,
          ry: radius,
          fill: 'transparent'
        }),
        h('rect', {
          x: x - width / 2,
          y: top,
          width,
          height: band,
          rx: radius,
          ry: radius,
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        }),
        h('line', {
          x1: x - width / 2,
          y1: top + band,
          x2: x + width / 2,
          y2: top + band,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 便签注释 */
function regNote(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 96, height: 72 })
      this.minWidth = 48
      this.minHeight = 40
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const l = x - width / 2
      const t = y - height / 2
      const fold = 12
      const d = `M ${l} ${t} H ${x + width / 2 - fold} L ${x + width / 2} ${t + fold} V ${t + height} H ${l} Z`
      return h('g', {}, [h('path', { d, ...diagramNodeShapeAttrs(style) })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 云 */
function regCloud(lf: LogicFlow, type: string) {
  class Model extends DiagramEllipseResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultEllipseRadii(this, data, { rx: 56, ry: 32 })
      this.minWidth = 40
      this.minHeight = 24
    }
    getResizeControlStyle() {
      return diagramResizeControlStyle()
    }
    getResizeOutlineStyle() {
      return diagramResizeOutlineStyle()
    }
    resize(resizeInfo: Parameters<EllipseResizeModel['resize']>[0]) {
      const data = super.resize(resizeInfo)
      syncNodeSizeProperties(this)
      return data
    }
  }
  class View extends DiagramResizableEllipseView {
    getShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const w = width
      const hgt = height
      const d = `M ${x - w * 0.35} ${y} a ${w * 0.18} ${hgt * 0.35} 0 1 0 ${w * 0.22} ${-hgt * 0.28} a ${w * 0.22} ${hgt * 0.38} 0 1 1 ${w * 0.28} ${-hgt * 0.08} a ${w * 0.2} ${hgt * 0.35} 0 1 1 ${-w * 0.12} ${hgt * 0.32} a ${w * 0.16} ${hgt * 0.3} 0 1 1 ${-w * 0.38} ${-hgt * 0.05} Z`
      return h('g', {}, [h('path', { d, ...diagramNodeShapeAttrs(style) })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** XOR 网关 */
function regXorGateway(lf: LogicFlow, type: string) {
  class Model extends DiagramDiamondResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultEllipseRadii(this, data, { rx: 40, ry: 40 })
      this.minWidth = 28
      this.minHeight = 28
    }
    getResizeControlStyle() {
      return diagramResizeControlStyle()
    }
    getResizeOutlineStyle() {
      return diagramResizeOutlineStyle()
    }
    resize(resizeInfo: Parameters<DiamondResizeModel['resize']>[0]) {
      const data = super.resize(resizeInfo)
      syncNodeSizeProperties(this)
      return data
    }
  }
  class View extends DiagramResizableDiamondView {
    getShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const diamond = super.getShape()
      const inset = Math.min(width, height) * 0.22
      return h('g', {}, [
        diamond,
        h('line', {
          x1: x - inset,
          y1: y - inset,
          x2: x + inset,
          y2: y + inset,
          stroke: style.stroke,
          strokeWidth: (style.strokeWidth as number) + 0.5
        }),
        h('line', {
          x1: x + inset,
          y1: y - inset,
          x2: x - inset,
          y2: y + inset,
          stroke: style.stroke,
          strokeWidth: (style.strokeWidth as number) + 0.5
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 参与者（简化） */
function regActor(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 48, height: 72 })
      this.minWidth = 32
      this.minHeight = 48
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const headR = Math.min(width, height) * 0.14
      const headY = y - height / 2 + headR + 4
      return h('g', {}, [
        h('circle', {
          cx: x,
          cy: headY,
          r: headR,
          fill: 'transparent',
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        }),
        h('line', {
          x1: x,
          y1: headY + headR,
          x2: x,
          y2: y + height * 0.15,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        }),
        h('line', {
          x1: x - width * 0.28,
          y1: y - height * 0.05,
          x2: x + width * 0.28,
          y2: y - height * 0.05,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        }),
        h('line', {
          x1: x,
          y1: y + height * 0.15,
          x2: x - width * 0.22,
          y2: y + height / 2 - 4,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        }),
        h('line', {
          x1: x,
          y1: y + height * 0.15,
          x2: x + width * 0.22,
          y2: y + height / 2 - 4,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 图片图元：内嵌 assets 或占位 */
function regImage(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 128, height: 96, radius: 4 })
      this.minWidth = 32
      this.minHeight = 32
    }
  }
  class View extends DiagramRectResizeView {
    shouldUpdate() {
      return true
    }

    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, radius } = model
      const style = model.getNodeStyle()
      const left = x - width / 2
      const top = y - height / 2
      const url = String(model.properties?.dgAssetUrl ?? '')
      if (url) {
        return h('g', {}, [
          h('image', {
            href: url,
            x: left,
            y: top,
            width,
            height,
            preserveAspectRatio: 'xMidYMid meet',
            clipPath: `inset(0 round ${radius}px)`
          }),
          h('rect', {
            x: left,
            y: top,
            width,
            height,
            rx: radius,
            ry: radius,
            fill: 'transparent',
            stroke: style.stroke,
            strokeWidth: style.strokeWidth
          })
        ])
      }
      return h('g', {}, [
        h('rect', {
          x: left,
          y: top,
          width,
          height,
          rx: radius,
          ry: radius,
          fill: style.fill ?? '#f4f4f6',
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: '6 4'
        }),
        h('text', {
          x,
          y: y + 4,
          fill: style.stroke ?? '#8a8a92',
          fontSize: 12,
          textAnchor: 'middle',
          dominantBaseline: 'middle'
        }, '图片')
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 可缩放文本图元 */
function regText(lf: LogicFlow, type: string) {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 120, height: 40, radius: 4 })
      this.minWidth = 32
      this.minHeight = 24
      this.text.editable = true
    }
  }
  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, radius } = model
      const style = model.getNodeStyle()
      return h('g', {}, [
        h('rect', {
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          rx: radius ?? 4,
          ry: radius ?? 4,
          fill: style.fill ?? 'transparent',
          stroke: style.stroke ?? 'transparent',
          strokeWidth: style.strokeWidth ?? 0
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

export function registerAllDiagramShapes(lf: LogicFlow): void {
  regText(lf, 'text')
  regText(lf, 'dg-text')
  regRect(lf, 'dg-rect', 104, 48, 0)
  regRect(lf, 'dg-round-rect', 104, 48, 10)
  regRect(lf, 'dg-square', 56, 56, 4)
  regCircle(lf, 'dg-circle', 30)
  regEllipse(lf, 'dg-ellipse', 52, 30)
  regDiamond(lf, 'dg-decision', 52, 36)
  regRect(lf, 'dg-terminator', 120, 44, 22)
  regRect(lf, 'dg-process', 120, 48, 4)
  regDocument(lf, 'dg-document')
  regMultiDocument(lf, 'dg-multi-document')
  regSubprocess(lf, 'dg-subprocess')
  regDelay(lf, 'dg-delay')
  regStoredData(lf, 'dg-stored-data')
  regComment(lf, 'dg-comment')
  regCircle(lf, 'dg-connector', 10)
  regSwimlane(lf, 'dg-swimlane')
  regNote(lf, 'dg-note')
  regCloud(lf, 'dg-cloud')
  regXorGateway(lf, 'dg-xor-gateway')
  regActor(lf, 'dg-actor')
  regImage(lf, 'dg-image')

  regPolygon(lf, 'dg-triangle-up', [
    [0, -34],
    [38, 30],
    [-38, 30]
  ])
  regPolygon(lf, 'dg-triangle-down', [
    [0, 34],
    [38, -30],
    [-38, -30]
  ])
  regPolygon(lf, 'dg-data', [
    [-44, -28],
    [34, -28],
    [44, 28],
    [-34, 28]
  ])
  regPolygon(lf, 'dg-manual-input', [
    [-36, -28],
    [36, -28],
    [28, 28],
    [-28, 28]
  ])
  regPolygon(lf, 'dg-preparation', [
    [0, -34],
    [38, -17],
    [38, 17],
    [0, 34],
    [-38, 17],
    [-38, -17]
  ])
  regPolygon(lf, 'dg-display', [
    [-48, -28],
    [48, -28],
    [48, 12],
    [0, 32],
    [-48, 12]
  ])
  regPolygon(lf, 'dg-or', [
    [0, -34],
    [30, -10],
    [30, 10],
    [0, 34],
    [-30, 10],
    [-30, -10]
  ])
  regPolygon(lf, 'dg-off-page', [
    [-32, -28],
    [32, -28],
    [32, 4],
    [14, 28],
    [-32, 28]
  ])
  regPolygon(lf, 'dg-merge', [
    [0, 30],
    [38, -26],
    [-38, -26]
  ])
  regPolygon(lf, 'dg-pentagon', [
    [0, -34],
    [36, -10],
    [22, 32],
    [-22, 32],
    [-36, -10]
  ])
  regPolygon(lf, 'dg-hexagon', [
    [0, -34],
    [38, -17],
    [38, 17],
    [0, 34],
    [-38, 17],
    [-38, -17]
  ])
  regPolygon(lf, 'dg-octagon', [
    [0, -36],
    [26, -26],
    [36, 0],
    [26, 26],
    [0, 36],
    [-26, 26],
    [-36, 0],
    [-26, -26]
  ])
  regPolygon(lf, 'dg-parallelogram', [
    [-40, -28],
    [32, -28],
    [40, 28],
    [-32, 28]
  ])
  regPolygon(lf, 'dg-trapezoid', [
    [-28, -28],
    [28, -28],
    [40, 28],
    [-40, 28]
  ])
  regPolygon(lf, 'dg-star', [
    [0, -36],
    [10, -10],
    [36, -10],
    [16, 6],
    [24, 34],
    [0, 18],
    [-24, 34],
    [-16, 6],
    [-36, -10],
    [-10, -10]
  ])
  regPolygon(lf, 'dg-cross', [
    [-12, -36],
    [12, -36],
    [12, -12],
    [36, -12],
    [36, 12],
    [12, 12],
    [12, 36],
    [-12, 36],
    [-12, 12],
    [-36, 12],
    [-36, -12],
    [-12, -12]
  ])
  registerDiagramGroupFrame(lf)
  registerDiagramEdges(lf)
}

let diagramEdgeAccent = '#3b82f6'
const edgeInsertHighlightIds = new Set<string>()

export function setDiagramEdgeAccent(theme: 'light' | 'dark'): void {
  diagramEdgeAccent = theme === 'dark' ? '#6ea8ff' : '#3b82f6'
}

export function setEdgeInsertHighlightId(edgeId: string | null): void {
  edgeInsertHighlightIds.clear()
  if (edgeId) edgeInsertHighlightIds.add(edgeId)
}

type EdgeModelConstructor = new (...args: any[]) => BaseEdgeModel

function hideEdgeOutlineModel<T extends EdgeModelConstructor>(Base: T): T {
  return class DiagramEdgeModel extends Base {
    constructor(...args: any[]) {
      super(...args)
    }

    getAdjustStart() {
      const pt = super.getAdjustStart()
      if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) return pt
      const { x, y } = this.startPoint
      return { x, y }
    }

    getAdjustEnd() {
      const pt = super.getAdjustEnd()
      if (pt && Number.isFinite(pt.x) && Number.isFinite(pt.y)) return pt
      const { x, y } = this.endPoint
      return { x, y }
    }

    getOutlineStyle() {
      const style = super.getOutlineStyle()
      style.stroke = 'none'
      if (style.hover && typeof style.hover === 'object') {
        style.hover.stroke = 'none'
      }
      return style
    }

    getEdgeStyle() {
      const style = super.getEdgeStyle()
      const propsStyle = (this.properties?.style ?? {}) as Record<string, unknown>
      const userStroke = propsStyle.stroke
      const baseWidth = Number(propsStyle.strokeWidth ?? style.strokeWidth ?? 1.5)

      if (edgeInsertHighlightIds.has(this.id)) {
        return {
          ...style,
          stroke: userStroke != null ? String(userStroke) : diagramEdgeAccent,
          strokeWidth: Math.max(baseWidth, 3),
          strokeDasharray: '8 4'
        }
      }

      if (!this.isSelected) return style

      return {
        ...style,
        stroke: userStroke != null ? String(userStroke) : diagramEdgeAccent,
        strokeWidth: Math.max(baseWidth, 2.5)
      }
    }

    getTextStyle(): LogicFlow.EdgeTextTheme {
      const style = super.getTextStyle()
      const propsStyle = (this.properties?.textStyle ?? {}) as Partial<LogicFlow.EdgeTextTheme>
      const ink = propsStyle.fill ?? propsStyle.color ?? style.fill ?? style.color
      return {
        ...style,
        ...propsStyle,
        textWidth: propsStyle.textWidth ?? style.textWidth,
        fontSize: propsStyle.fontSize ?? style.fontSize,
        ...(ink != null ? { fill: ink, color: ink } : {})
      }
    }
  } as T
}

function registerDiagramEdges(lf: LogicFlow): void {
  lf.register({
    type: 'polyline',
    view: DiagramPolylineEdge,
    model: hideEdgeOutlineModel(PolylineEdgeModel)
  })
  lf.register({
    type: 'line',
    view: DiagramLineEdge,
    model: hideEdgeOutlineModel(LineEdgeModel)
  })
  lf.register({
    type: 'bezier',
    view: DiagramBezierEdge,
    model: hideEdgeOutlineModel(BezierEdgeModel)
  })
}
