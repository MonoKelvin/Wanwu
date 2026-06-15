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
      { id: 'dg-connector', label: '连接点', lfType: 'dg-connector', defaultText: '', preview: { kind: 'circle', r: 0.22 } },
      {
        id: 'dg-summing-junction',
        label: '求和连接',
        lfType: 'dg-circle',
        defaultText: '+',
        preview: { kind: 'circle', r: 0.32 }
      },
      {
        id: 'dg-internal-storage',
        label: '内部存储',
        lfType: 'dg-stored-data',
        defaultText: '存储',
        preview: { kind: 'path', d: 'M6 9 A6 2 0 0 1 18 9 V15 A6 2 0 0 1 6 15 Z M6 9 A6 2 0 0 0 18 9' }
      }
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
      { id: 'dg-note', label: '便签', lfType: 'dg-note', defaultText: '说明', preview: { kind: 'path', d: 'M5 5 H15 L17 7 V17 H5 Z' } },
      {
        id: 'dg-uml-package',
        label: '包',
        lfType: 'dg-uml-class',
        defaultText: 'package',
        preview: { kind: 'path', d: 'M4 7 H10 V5 H18 V15 H4 Z' }
      },
      {
        id: 'dg-uml-component',
        label: '组件',
        lfType: 'dg-uml-class',
        defaultText: 'Component',
        preview: { kind: 'path', d: 'M6 6 H14 V14 H6 Z M4 8 H5 V12 H4 Z M17 8 H18 V12 H17 Z' }
      },
      {
        id: 'dg-uml-usecase',
        label: '用例',
        lfType: 'dg-uml-usecase',
        defaultText: '用例',
        preview: { kind: 'ellipse', rx: 0.9, ry: 0.45 }
      },
      {
        id: 'dg-uml-state',
        label: '状态',
        lfType: 'dg-uml-state',
        defaultText: '状态',
        preview: { kind: 'rect', w: 1.5, h: 0.75, r: 0.18 }
      },
      {
        id: 'dg-uml-abstract',
        label: '抽象类',
        lfType: 'dg-uml-class',
        defaultText: 'AbstractClass',
        preview: { kind: 'path', d: 'M4 5 H18 V15 H4 Z M4 9 H18' }
      },
      {
        id: 'dg-uml-enum',
        label: '枚举',
        lfType: 'dg-uml-class',
        defaultText: 'EnumName',
        preview: { kind: 'path', d: 'M4 5 H18 V15 H4 Z M4 9 H18 M4 12 H18' }
      },
      {
        id: 'dg-uml-start',
        label: '初始状态',
        lfType: 'dg-uml-start',
        defaultText: '',
        preview: { kind: 'circle', r: 0.22 }
      },
      {
        id: 'dg-uml-end',
        label: '结束状态',
        lfType: 'dg-uml-end',
        defaultText: '',
        preview: { kind: 'path', d: 'M12 8 A4 4 0 1 1 12 16 A4 4 0 1 1 12 8 M12 9.5 A2.5 2.5 0 1 0 12 14.5 A2.5 2.5 0 1 0 12 9.5' }
      },
      {
        id: 'dg-uml-lifeline',
        label: '生命线',
        lfType: 'dg-uml-lifeline',
        defaultText: 'Object',
        preview: { kind: 'path', d: 'M7 5 H15 V8 H7 Z M11 8 V17' }
      }
    ]
  },
  {
    id: 'mindmap',
    label: '思维导图',
    items: [
      {
        id: 'dg-mindmap-central',
        label: '中心主题',
        lfType: 'dg-mindmap-central',
        defaultText: '中心主题',
        preview: { kind: 'rect', w: 1.8, h: 0.65, r: 0.22 }
      },
      {
        id: 'dg-mindmap-branch',
        label: '分支主题',
        lfType: 'dg-mindmap-branch',
        defaultText: '分支主题',
        preview: { kind: 'rect', w: 1.4, h: 0.5, r: 0.14 }
      },
      {
        id: 'dg-mindmap-floating',
        label: '自由主题',
        lfType: 'dg-mindmap-floating',
        defaultText: '自由主题',
        preview: { kind: 'rect', w: 1.3, h: 0.48, r: 0.12 }
      }
    ]
  },
  {
    id: 'table',
    label: '表格',
    items: [
      {
        id: 'dg-table',
        label: '表格',
        lfType: 'dg-table',
        defaultText: '',
        preview: { kind: 'path', d: 'M4 6 H18 V16 H4 Z M4 9 H18 M4 12 H18 M9 6 V16 M14 6 V16' }
      }
    ]
  },
  {
    id: 'architecture',
    label: '架构',
    items: [
      { id: 'dg-cloud', label: '云服务', lfType: 'dg-cloud', defaultText: '云服务', preview: { kind: 'path', d: 'M7 12 A3 2 0 0 1 10 9 A4 3 0 0 1 16 10 A3 2.5 0 0 1 14 14 H8 A3 2 0 0 1 7 12 Z' } },
      {
        id: 'dg-server',
        label: '服务器',
        lfType: 'dg-rect',
        defaultText: '服务器',
        preview: { kind: 'rect', w: 1.35, h: 0.85, r: 0.08 }
      },
      {
        id: 'dg-api',
        label: 'API',
        lfType: 'dg-round-rect',
        defaultText: 'API',
        preview: { kind: 'rect', w: 1.55, h: 0.62, r: 0.22 }
      },
      {
        id: 'dg-queue',
        label: '消息队列',
        lfType: 'dg-data',
        defaultText: '队列',
        preview: { kind: 'polygon', points: [[-1, -0.7], [0.75, -0.7], [1, 0.7], [-0.8, 0.7]] }
      },
      { id: 'dg-swimlane', label: '泳道', lfType: 'dg-swimlane', defaultText: '泳道', preview: { kind: 'path', d: 'M3 6 H19 V16 H3 Z M3 9 H19' } },
      { id: 'dg-xor-gateway', label: 'XOR 网关', lfType: 'dg-xor-gateway', defaultText: '', preview: { kind: 'diamond', rx: 0.85, ry: 0.85 } },
      {
        id: 'dg-database',
        label: '数据库',
        lfType: 'dg-stored-data',
        defaultText: '数据库',
        preview: { kind: 'path', d: 'M5 8 A7 2 0 0 1 19 8 V16 A7 2 0 0 1 5 16 Z M5 8 A7 2 0 0 0 19 8' }
      },
      {
        id: 'dg-cache',
        label: '缓存',
        lfType: 'dg-round-rect',
        defaultText: '缓存',
        preview: { kind: 'rect', w: 1.4, h: 0.68, r: 0.14 }
      },
      {
        id: 'dg-load-balancer',
        label: '负载均衡',
        lfType: 'dg-hexagon',
        defaultText: 'LB',
        preview: {
          kind: 'polygon',
          points: [[0, -0.85], [0.95, -0.42], [0.95, 0.42], [0, 0.85], [-0.95, 0.42], [-0.95, -0.42]]
        }
      },
      {
        id: 'dg-container',
        label: '容器',
        lfType: 'dg-round-rect',
        defaultText: '容器',
        preview: { kind: 'rect', w: 1.35, h: 0.95, r: 0.1 }
      },
      {
        id: 'dg-client',
        label: '客户端',
        lfType: 'dg-actor',
        defaultText: '用户',
        preview: { kind: 'path', d: 'M12 5 A2.5 2.5 0 1 1 12 10 A2.5 2.5 0 1 1 12 5 M12 10 V14 M8 12 H16 M12 14 L9 18 M12 14 L15 18' }
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
      },
      {
        id: 'dg-bpmn-intermediate',
        label: '中间事件',
        lfType: 'dg-circle',
        defaultText: '',
        preview: { kind: 'path', d: 'M12 7 A5 5 0 1 1 12 17 A5 5 0 1 1 12 7 M12 8.5 A3.5 3.5 0 1 0 12 15.5 A3.5 3.5 0 1 0 12 8.5' }
      },
      {
        id: 'dg-bpmn-subprocess',
        label: '子流程',
        lfType: 'dg-subprocess',
        defaultText: '子流程',
        preview: { kind: 'path', d: 'M4 6 H18 V16 H4 Z M7 8 V14 M15 8 V14' }
      },
      {
        id: 'dg-bpmn-message',
        label: '消息',
        lfType: 'dg-document',
        defaultText: '消息',
        preview: { kind: 'path', d: 'M4 5 H16 L18 7 V19 H4 Z' }
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
      { id: 'dg-comment', label: '注释', lfType: 'dg-comment', defaultText: '注释', preview: { kind: 'rect', w: 1.6, h: 0.65, r: 0.06 } },
      {
        id: 'dg-callout',
        label: '标注框',
        lfType: 'dg-comment',
        defaultText: '说明',
        preview: { kind: 'path', d: 'M5 5 H15 L17 7 V14 H10 L7 17 V14 H5 Z' }
      }
    ]
  }
]
