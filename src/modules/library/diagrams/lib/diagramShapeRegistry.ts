import LogicFlow, {
  CircleNode,
  CircleNodeModel,
  DiamondNode,
  DiamondNodeModel,
  EllipseNode,
  EllipseNodeModel,
  PolygonNode,
  PolygonNodeModel,
  RectNode,
  RectNodeModel,
  h
} from '@logicflow/core'
import type { ShapePreviewSpec } from '@modules/library/diagrams/lib/diagramShapePreview'

type Point = [number, number]

export interface DiagramShapeItem {
  id: string
  label: string
  lfType: string
  defaultText: string
  preview: ShapePreviewSpec
}

export interface DiagramShapeCategory {
  id: string
  label: string
  items: DiagramShapeItem[]
}

function regPolygon(lf: LogicFlow, type: string, points: Point[]) {
  class Model extends PolygonNodeModel {
    setAttributes() {
      this.points = points
    }
  }
  lf.register({ type, view: PolygonNode, model: Model })
}

function regRect(lf: LogicFlow, type: string, width: number, height: number, radius = 0) {
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = width
      this.height = height
      this.radius = radius
    }
  }
  lf.register({ type, view: RectNode, model: Model })
}

function regCircle(lf: LogicFlow, type: string, r: number) {
  class Model extends CircleNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.r = r
    }
  }
  lf.register({ type, view: CircleNode, model: Model })
}

function regEllipse(lf: LogicFlow, type: string, rx: number, ry: number) {
  class Model extends EllipseNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = rx
      this.ry = ry
    }
  }
  lf.register({ type, view: EllipseNode, model: Model })
}

function regDiamond(lf: LogicFlow, type: string, rx: number, ry: number) {
  class Model extends DiamondNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.rx = rx
      this.ry = ry
    }
  }
  lf.register({ type, view: DiamondNode, model: Model })
}

/** 文档：折角矩形 */
function regDocument(lf: LogicFlow, type: string) {
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 100
      this.height = 72
      this.radius = 2
    }
  }
  class View extends RectNode {
    getShape() {
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
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 120
      this.height = 52
      this.radius = 4
    }
  }
  class View extends RectNode {
    getShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const base = super.getShape()
      const inset = 10
      return h('g', {}, [
        base,
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
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 100
      this.height = 72
    }
  }
  class View extends RectNode {
    getShape() {
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
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 100
      this.height = 52
    }
  }
  class View extends RectNode {
    getShape() {
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
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 88
      this.height = 56
    }
  }
  class View extends RectNode {
    getShape() {
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
  class Model extends RectNodeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      this.width = 108
      this.height = 48
      this.radius = 4
    }
  }
  class View extends RectNode {
    getShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const base = super.getShape()
      return h('g', {}, [
        base,
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
}

export const DIAGRAM_SHAPE_CATEGORIES: DiagramShapeCategory[] = [
  {
    id: 'basic',
    label: '基础',
    items: [
      { id: 'dg-rect', label: '矩形', lfType: 'dg-rect', defaultText: '矩形', preview: { kind: 'rect', w: 1.6, h: 0.75 } },
      { id: 'dg-round-rect', label: '圆角矩形', lfType: 'dg-round-rect', defaultText: '圆角', preview: { kind: 'rect', w: 1.6, h: 0.75, r: 0.15 } },
      { id: 'dg-square', label: '正方形', lfType: 'dg-square', defaultText: '正方形', preview: { kind: 'rect', w: 1, h: 1, r: 0.06 } },
      { id: 'dg-circle', label: '圆形', lfType: 'dg-circle', defaultText: '圆形', preview: { kind: 'circle', r: 0.5 } },
      { id: 'dg-ellipse', label: '椭圆', lfType: 'dg-ellipse', defaultText: '椭圆', preview: { kind: 'ellipse', rx: 0.85, ry: 0.5 } },
      { id: 'dg-decision', label: '菱形', lfType: 'dg-decision', defaultText: '菱形', preview: { kind: 'diamond', rx: 0.85, ry: 0.6 } },
      { id: 'dg-triangle-up', label: '三角形', lfType: 'dg-triangle-up', defaultText: '三角形', preview: { kind: 'polygon', points: [[0, -0.85], [0.95, 0.75], [-0.95, 0.75]] } },
      { id: 'dg-triangle-down', label: '倒三角', lfType: 'dg-triangle-down', defaultText: '倒三角', preview: { kind: 'polygon', points: [[0, 0.85], [0.95, -0.75], [-0.95, -0.75]] } }
    ]
  },
  {
    id: 'flowchart',
    label: '流程图',
    items: [
      { id: 'dg-terminator', label: '开始/结束', lfType: 'dg-terminator', defaultText: '开始', preview: { kind: 'rect', w: 1.7, h: 0.65, r: 0.35 } },
      { id: 'dg-process', label: '过程', lfType: 'dg-process', defaultText: '过程', preview: { kind: 'rect', w: 1.7, h: 0.7, r: 0.06 } },
      { id: 'dg-decision-flow', label: '判定', lfType: 'dg-decision', defaultText: '判定?', preview: { kind: 'diamond', rx: 0.9, ry: 0.65 } },
      { id: 'dg-document', label: '文档', lfType: 'dg-document', defaultText: '文档', preview: { kind: 'path', d: 'M4 5 H16 L18 7 V19 H4 Z' } },
      { id: 'dg-multi-document', label: '多文档', lfType: 'dg-multi-document', defaultText: '多文档', preview: { kind: 'path', d: 'M6 7 H16 L18 9 V19 H6 Z M4 5 H14 L16 7 V17 H4 Z' } },
      { id: 'dg-data', label: '数据', lfType: 'dg-data', defaultText: '数据', preview: { kind: 'polygon', points: [[-1, -0.7], [0.75, -0.7], [1, 0.7], [-0.8, 0.7]] } },
      {
        id: 'dg-subprocess',
        label: '子流程',
        lfType: 'dg-subprocess',
        defaultText: '子流程',
        preview: { kind: 'path', d: 'M4 6 H18 V16 H4 Z M7 8 V14 M15 8 V14' }
      },
      { id: 'dg-preparation', label: '准备', lfType: 'dg-preparation', defaultText: '准备', preview: { kind: 'polygon', points: [[0, -0.85], [0.95, -0.42], [0.95, 0.42], [0, 0.85], [-0.95, 0.42], [-0.95, -0.42]] } },
      { id: 'dg-manual-input', label: '人工输入', lfType: 'dg-manual-input', defaultText: '输入', preview: { kind: 'polygon', points: [[-0.9, -0.7], [0.9, -0.7], [0.7, 0.7], [-0.7, 0.7]] } },
      { id: 'dg-delay', label: '延迟', lfType: 'dg-delay', defaultText: '延迟', preview: { kind: 'path', d: 'M4 6 H11 A5 5 0 0 1 11 16 H4 Z' } },
      { id: 'dg-display', label: '显示', lfType: 'dg-display', defaultText: '显示', preview: { kind: 'polygon', points: [[-1, -0.7], [1, -0.7], [1, 0.2], [0, 0.85], [-1, 0.2]] } },
      { id: 'dg-stored-data', label: '存储', lfType: 'dg-stored-data', defaultText: '存储', preview: { kind: 'path', d: 'M5 8 A7 2 0 0 1 19 8 V16 A7 2 0 0 1 5 16 Z M5 8 A7 2 0 0 0 19 8' } },
      { id: 'dg-or', label: '或者', lfType: 'dg-or', defaultText: '或', preview: { kind: 'polygon', points: [[0, -0.85], [0.75, -0.25], [0.75, 0.25], [0, 0.85], [-0.75, 0.25], [-0.75, -0.25]] } },
      { id: 'dg-off-page', label: '离页连接', lfType: 'dg-off-page', defaultText: '离页', preview: { kind: 'polygon', points: [[-0.8, -0.7], [0.8, -0.7], [0.8, 0.1], [0.35, 0.85], [-0.8, 0.85]] } },
      { id: 'dg-merge', label: '合并', lfType: 'dg-merge', defaultText: '合并', preview: { kind: 'polygon', points: [[0, 0.85], [0.95, -0.75], [-0.95, -0.75]] } },
      { id: 'dg-connector', label: '连接点', lfType: 'dg-connector', defaultText: '', preview: { kind: 'circle', r: 0.22 } }
    ]
  },
  {
    id: 'polygon',
    label: '多边形',
    items: [
      { id: 'dg-pentagon', label: '五边形', lfType: 'dg-pentagon', defaultText: '五边形', preview: { kind: 'polygon', points: [[0, -0.85], [0.9, -0.25], [0.55, 0.8], [-0.55, 0.8], [-0.9, -0.25]] } },
      { id: 'dg-hexagon', label: '六边形', lfType: 'dg-hexagon', defaultText: '六边形', preview: { kind: 'polygon', points: [[0, -0.85], [0.95, -0.42], [0.95, 0.42], [0, 0.85], [-0.95, 0.42], [-0.95, -0.42]] } },
      { id: 'dg-octagon', label: '八边形', lfType: 'dg-octagon', defaultText: '八边形', preview: { kind: 'polygon', points: [[0, -0.9], [0.65, -0.65], [0.9, 0], [0.65, 0.65], [0, 0.9], [-0.65, 0.65], [-0.9, 0], [-0.65, -0.65]] } },
      { id: 'dg-parallelogram', label: '平行四边形', lfType: 'dg-parallelogram', defaultText: '平行四边形', preview: { kind: 'polygon', points: [[-0.9, -0.7], [0.7, -0.7], [0.9, 0.7], [-0.7, 0.7]] } },
      { id: 'dg-trapezoid', label: '梯形', lfType: 'dg-trapezoid', defaultText: '梯形', preview: { kind: 'polygon', points: [[-0.65, -0.7], [0.65, -0.7], [0.9, 0.7], [-0.9, 0.7]] } },
      { id: 'dg-star', label: '五角星', lfType: 'dg-star', defaultText: '星形', preview: { kind: 'polygon', points: [[0, -0.9], [0.25, -0.25], [0.9, -0.25], [0.35, 0.15], [0.55, 0.85], [0, 0.45], [-0.55, 0.85], [-0.35, 0.15], [-0.9, -0.25], [-0.25, -0.25]] } },
      { id: 'dg-cross', label: '十字', lfType: 'dg-cross', defaultText: '十字', preview: { kind: 'polygon', points: [[-0.3, -0.9], [0.3, -0.9], [0.3, -0.3], [0.9, -0.3], [0.9, 0.3], [0.3, 0.3], [0.3, 0.9], [-0.3, 0.9], [-0.3, 0.3], [-0.9, 0.3], [-0.9, -0.3], [-0.3, -0.3]] } }
    ]
  },
  {
    id: 'annotation',
    label: '标注',
    items: [
      { id: 'dg-text', label: '文本', lfType: 'text', defaultText: '文本', preview: { kind: 'text' } },
      { id: 'dg-comment', label: '注释', lfType: 'dg-comment', defaultText: '注释', preview: { kind: 'rect', w: 1.6, h: 0.65, r: 0.06 } }
    ]
  }
]

const SHAPE_BY_ID = new Map<string, DiagramShapeItem>(
  DIAGRAM_SHAPE_CATEGORIES.flatMap((c) => c.items).map((item) => [item.id, item])
)

export function getDiagramShapeById(id: string): DiagramShapeItem | undefined {
  return SHAPE_BY_ID.get(id)
}

export function buildDiagramNodeConfig(
  shapeId: string,
  x: number,
  y: number,
  text?: string,
  properties?: Record<string, unknown>
): LogicFlow.NodeConfig {
  const item = getDiagramShapeById(shapeId)
  if (!item) throw new Error(`未知图元: ${shapeId}`)

  const base: LogicFlow.NodeConfig = {
    type: item.lfType,
    x,
    y,
    text: text ?? item.defaultText,
    properties: { ...properties }
  }

  if (item.lfType === 'text') {
    base.properties = {
      fontSize: 14,
      ...base.properties
    }
  }

  return base
}
