import LogicFlow, {
  BezierEdge,
  BezierEdgeModel,
  h,
  LineEdge,
  LineEdgeModel,
  PolylineEdge,
  PolylineEdgeModel
} from '@logicflow/core'
import { DiamondResizeModel, DiamondResizeView } from '@logicflow/extension/lib/NodeResize/node/DiamondResize'
import { EllipseResizeModel, EllipseResizeView } from '@logicflow/extension/lib/NodeResize/node/EllipseResize'
import { RectResizeModel, RectResizeView } from '@logicflow/extension/lib/NodeResize/node/RectResize'
import { diagramResizeControlStyle } from '@modules/library/diagrams/lib/diagramShapeResize'

type Point = [number, number]

function polyBasis(points: Point[]) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [px, py] of points) {
    minX = Math.min(minX, px)
    maxX = Math.max(maxX, px)
    minY = Math.min(minY, py)
    maxY = Math.max(maxY, py)
  }
  return { width: maxX - minX, height: maxY - minY }
}

function regPolygon(lf: LogicFlow, type: string, points: Point[]) {
  const basis = polyBasis(points)
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = basis.width
      this.height = basis.height
      this.minWidth = 20
      this.minHeight = 20
      this.properties = {
        ...this.properties,
        dgPolyPoints: points,
        dgPolyBasisW: basis.width,
        dgPolyBasisH: basis.height
      }
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, properties } = model
      const style = model.getNodeStyle()
      const orig = (properties.dgPolyPoints ?? points) as Point[]
      const bw = Number(properties.dgPolyBasisW ?? basis.width)
      const bh = Number(properties.dgPolyBasisH ?? basis.height)
      const sx = width / bw
      const sy = height / bh
      const pts = orig.map(([px, py]) => `${x + px * sx},${y + py * sy}`).join(' ')
      return h('g', {}, [
        h('polygon', {
          points: pts,
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

function regRect(lf: LogicFlow, type: string, width: number, height: number, radius = 0) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = width
      this.height = height
      this.radius = radius
      this.minWidth = 24
      this.minHeight = 24
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {}
  lf.register({ type, view: View, model: Model })
}

function regCircle(lf: LogicFlow, type: string, r: number) {
  class Model extends EllipseResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = r
      this.ry = r
      this.minWidth = 16
      this.minHeight = 16
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends EllipseResizeView {}
  lf.register({ type, view: View, model: Model })
}

function regEllipse(lf: LogicFlow, type: string, rx: number, ry: number) {
  class Model extends EllipseResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = rx
      this.ry = ry
      this.minWidth = 20
      this.minHeight = 16
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends EllipseResizeView {}
  lf.register({ type, view: View, model: Model })
}

function regDiamond(lf: LogicFlow, type: string, rx: number, ry: number) {
  class Model extends DiamondResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = rx
      this.ry = ry
      this.minWidth = 24
      this.minHeight = 24
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends DiamondResizeView {}
  lf.register({ type, view: View, model: Model })
}

/** 文档：折角矩形 */
function regDocument(lf: LogicFlow, type: string) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 100
      this.height = 72
      this.radius = 2
      this.minWidth = 40
      this.minHeight = 32
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
      return h('g', {}, [h('path', { d, ...style, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 子流程：双侧竖线 */
function regSubprocess(lf: LogicFlow, type: string) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 120
      this.height = 52
      this.radius = 4
      this.minWidth = 48
      this.minHeight = 32
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 100
      this.height = 72
      this.minWidth = 40
      this.minHeight = 32
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
        return h('path', { d, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth })
      }
      return h('g', {}, [drawDoc(6, 6), drawDoc(0, 0)])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 延迟：D 形 */
function regDelay(lf: LogicFlow, type: string) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 100
      this.height = 52
      this.minWidth = 40
      this.minHeight = 28
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
      return h('g', {}, [h('path', { d, ...style, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 存储：圆柱 */
function regStoredData(lf: LogicFlow, type: string) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 88
      this.height = 56
      this.minWidth = 36
      this.minHeight = 32
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
        h('path', { d, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth }),
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
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 108
      this.height = 48
      this.radius = 4
      this.minWidth = 48
      this.minHeight = 28
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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

/** UML 类 */
function regUmlClass(lf: LogicFlow, type: string) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 112
      this.height = 88
      this.radius = 2
      this.minWidth = 56
      this.minHeight = 48
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height, radius } = model
      const style = model.getNodeStyle()
      const top = y - height / 2
      const header = height * 0.3
      return h('g', {}, [
        h('rect', {
          ...style,
          x: x - width / 2,
          y: top,
          width,
          height,
          rx: radius,
          ry: radius
        }),
        h('line', {
          x1: x - width / 2,
          y1: top + header,
          x2: x + width / 2,
          y2: top + header,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth
        })
      ])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 泳道 */
function regSwimlane(lf: LogicFlow, type: string) {
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 200
      this.height = 120
      this.radius = 4
      this.minWidth = 80
      this.minHeight = 48
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 96
      this.height = 72
      this.minWidth = 48
      this.minHeight = 40
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const l = x - width / 2
      const t = y - height / 2
      const fold = 12
      const d = `M ${l} ${t} H ${x + width / 2 - fold} L ${x + width / 2} ${t + fold} V ${t + height} H ${l} Z`
      return h('g', {}, [h('path', { d, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** 云 */
function regCloud(lf: LogicFlow, type: string) {
  class Model extends EllipseResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = 56
      this.ry = 32
      this.minWidth = 40
      this.minHeight = 24
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends EllipseResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const w = width
      const hgt = height
      const d = `M ${x - w * 0.35} ${y} a ${w * 0.18} ${hgt * 0.35} 0 1 0 ${w * 0.22} ${-hgt * 0.28} a ${w * 0.22} ${hgt * 0.38} 0 1 1 ${w * 0.28} ${-hgt * 0.08} a ${w * 0.2} ${hgt * 0.35} 0 1 1 ${-w * 0.12} ${hgt * 0.32} a ${w * 0.16} ${hgt * 0.3} 0 1 1 ${-w * 0.38} ${-hgt * 0.05} Z`
      return h('g', {}, [h('path', { d, fill: style.fill, stroke: style.stroke, strokeWidth: style.strokeWidth })])
    }
  }
  lf.register({ type, view: View, model: Model })
}

/** XOR 网关 */
function regXorGateway(lf: LogicFlow, type: string) {
  class Model extends DiamondResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = 40
      this.ry = 40
      this.minWidth = 28
      this.minHeight = 28
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends DiamondResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const diamond = super.getResizeShape()
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
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 48
      this.height = 72
      this.minWidth = 32
      this.minHeight = 48
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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
  class Model extends RectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 128
      this.height = 96
      this.radius = 4
      this.minWidth = 32
      this.minHeight = 32
    }
    getControlPointStyle() {
      return diagramResizeControlStyle()
    }
  }
  class View extends RectResizeView {
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

export function registerAllDiagramShapes(lf: LogicFlow): void {
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
  regUmlClass(lf, 'dg-uml-class')
  regUmlClass(lf, 'dg-uml-interface')
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
  registerDiagramEdges(lf)
}

let diagramEdgeAccent = '#3b82f6'

export function setDiagramEdgeAccent(theme: 'light' | 'dark'): void {
  diagramEdgeAccent = theme === 'dark' ? '#6ea8ff' : '#3b82f6'
}

function hideEdgeOutlineModel<T extends typeof PolylineEdgeModel>(Base: T) {
  return class DiagramEdgeModel extends Base {
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
      if (this.isSelected) {
        return {
          ...style,
          stroke: diagramEdgeAccent,
          strokeWidth: Math.max(Number(style.strokeWidth ?? 1.5), 2.5)
        }
      }
      return style
    }
  }
}

function registerDiagramEdges(lf: LogicFlow): void {
  lf.register({
    type: 'polyline',
    view: PolylineEdge,
    model: hideEdgeOutlineModel(PolylineEdgeModel)
  })
  lf.register({
    type: 'line',
    view: LineEdge,
    model: hideEdgeOutlineModel(LineEdgeModel)
  })
  lf.register({
    type: 'bezier',
    view: BezierEdge,
    model: hideEdgeOutlineModel(BezierEdgeModel)
  })
}
