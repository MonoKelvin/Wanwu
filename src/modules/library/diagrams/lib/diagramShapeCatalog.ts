import type { DiagramShapeCategory } from '@modules/library/diagrams/lib/diagramShapeTypes'

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
    id: 'uml',
    label: 'UML',
    items: [
      {
        id: 'dg-uml-class',
        label: '类',
        lfType: 'dg-uml-class',
        defaultText: 'ClassName',
        preview: { kind: 'path', d: 'M4 5 H18 V15 H4 Z M4 9 H18' }
      },
      {
        id: 'dg-uml-interface',
        label: '接口',
        lfType: 'dg-uml-interface',
        defaultText: '«interface»\nIName',
        preview: { kind: 'path', d: 'M4 5 H18 V15 H4 Z M4 8 H18' }
      },
      { id: 'dg-actor', label: '参与者', lfType: 'dg-actor', defaultText: '参与者', preview: { kind: 'path', d: 'M12 5 A2.5 2.5 0 1 1 12 10 A2.5 2.5 0 1 1 12 5 M12 10 V14 M8 12 H16 M12 14 L9 18 M12 14 L15 18' } },
      { id: 'dg-note', label: '便签', lfType: 'dg-note', defaultText: '说明', preview: { kind: 'path', d: 'M5 5 H15 L17 7 V17 H5 Z' } }
    ]
  },
  {
    id: 'architecture',
    label: '架构',
    items: [
      { id: 'dg-cloud', label: '云服务', lfType: 'dg-cloud', defaultText: '云服务', preview: { kind: 'path', d: 'M7 12 A3 2 0 0 1 10 9 A4 3 0 0 1 16 10 A3 2.5 0 0 1 14 14 H8 A3 2 0 0 1 7 12 Z' } },
      { id: 'dg-swimlane', label: '泳道', lfType: 'dg-swimlane', defaultText: '泳道', preview: { kind: 'path', d: 'M3 6 H19 V16 H3 Z M3 9 H19' } },
      { id: 'dg-xor-gateway', label: 'XOR 网关', lfType: 'dg-xor-gateway', defaultText: '', preview: { kind: 'diamond', rx: 0.85, ry: 0.85 } },
      {
        id: 'dg-database',
        label: '数据库',
        lfType: 'dg-stored-data',
        defaultText: '数据库',
        preview: { kind: 'path', d: 'M5 8 A7 2 0 0 1 19 8 V16 A7 2 0 0 1 5 16 Z M5 8 A7 2 0 0 0 19 8' }
      }
    ]
  },
  {
    id: 'bpmn',
    label: 'BPMN',
    items: [
      {
        id: 'dg-bpmn-start',
        label: '开始事件',
        lfType: 'dg-terminator',
        defaultText: '',
        preview: { kind: 'circle', r: 0.35 }
      },
      {
        id: 'dg-bpmn-task',
        label: '任务',
        lfType: 'dg-process',
        defaultText: '任务',
        preview: { kind: 'rect', w: 1.6, h: 0.7, r: 0.1 }
      },
      {
        id: 'dg-bpmn-gateway',
        label: '排他网关',
        lfType: 'dg-xor-gateway',
        defaultText: '',
        preview: { kind: 'diamond', rx: 0.85, ry: 0.85 }
      },
      {
        id: 'dg-bpmn-end',
        label: '结束事件',
        lfType: 'dg-terminator',
        defaultText: '',
        preview: { kind: 'circle', r: 0.35 }
      },
      {
        id: 'dg-bpmn-lane',
        label: '泳道',
        lfType: 'dg-swimlane',
        defaultText: '泳道',
        preview: { kind: 'path', d: 'M3 6 H19 V16 H3 Z M3 9 H19' }
      }
    ]
  },
  {
    id: 'annotation',
    label: '标注',
    items: [
      {
        id: 'dg-image',
        label: '图片',
        lfType: 'dg-image',
        defaultText: '',
        preview: { kind: 'rect', w: 1.5, h: 1.1, r: 0.08 }
      },
      { id: 'dg-text', label: '文本', lfType: 'text', defaultText: '文本', preview: { kind: 'text' } },
      { id: 'dg-comment', label: '注释', lfType: 'dg-comment', defaultText: '注释', preview: { kind: 'rect', w: 1.6, h: 0.65, r: 0.06 } }
    ]
  }
]
