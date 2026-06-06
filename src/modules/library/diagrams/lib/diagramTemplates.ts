import type { DiagramContent, DiagramTemplate } from '@shared/types/diagrams'
import { createBlankDiagramContent } from './blankContent'

const templates: DiagramTemplate[] = [
  {
    id: 'tpl-blank',
    name: '空白文档',
    description: '从零开始绘制',
    content: createBlankDiagramContent()
  },
  {
    id: 'tpl-flow',
    name: '业务流程图',
    description: '顺序流转与阶段划分',
    content: flowTemplate()
  },
  {
    id: 'tpl-decision',
    name: '程序逻辑图',
    description: '条件判断与分支路径',
    content: decisionTemplate()
  },
  {
    id: 'tpl-swimlane',
    name: '工作流程图',
    description: '步骤串联与任务推进',
    content: stepsTemplate()
  },
  {
    id: 'tpl-mind',
    name: '组织架构图',
    description: '层级关系与中心辐射',
    content: radialTemplate()
  },
  {
    id: 'tpl-uml-class',
    name: 'UML 类图',
    description: '类、接口与关联关系',
    content: umlClassTemplate()
  },
  {
    id: 'tpl-use-case',
    name: '用例图',
    description: '参与者与用例交互',
    content: useCaseTemplate()
  },
  {
    id: 'tpl-architecture',
    name: '系统架构图',
    description: '服务、网关与数据层',
    content: architectureTemplate()
  },
  {
    id: 'tpl-bpmn',
    name: '泳道流程',
    description: '跨部门协作与任务流转',
    content: bpmnSwimlaneTemplate()
  }
]

function flowTemplate(): DiagramContent {
  const content = createBlankDiagramContent('业务流程图')
  content.pages[0]!.graphData = {
    nodes: [
      { id: 'n1', type: 'rect', x: 120, y: 80, text: '开始', properties: {} },
      { id: 'n2', type: 'rect', x: 320, y: 80, text: '处理', properties: {} },
      { id: 'n3', type: 'rect', x: 520, y: 80, text: '结束', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n2', targetNodeId: 'n3' }
    ]
  }
  return content
}

function decisionTemplate(): DiagramContent {
  const content = createBlankDiagramContent('程序逻辑图')
  content.pages[0]!.graphData = {
    nodes: [
      { id: 'n1', type: 'rect', x: 200, y: 60, text: '开始', properties: {} },
      { id: 'n2', type: 'diamond', x: 200, y: 180, text: '条件?', properties: {} },
      { id: 'n3', type: 'rect', x: 80, y: 320, text: '是', properties: {} },
      { id: 'n4', type: 'rect', x: 320, y: 320, text: '否', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n2', targetNodeId: 'n3' },
      { id: 'e3', type: 'polyline', sourceNodeId: 'n2', targetNodeId: 'n4' }
    ]
  }
  return content
}

function stepsTemplate(): DiagramContent {
  const content = createBlankDiagramContent('工作流程图')
  content.pages[0]!.graphData = {
    nodes: [
      { id: 'n1', type: 'rect', x: 200, y: 60, text: '步骤 1', properties: {} },
      { id: 'n2', type: 'rect', x: 200, y: 180, text: '步骤 2', properties: {} },
      { id: 'n3', type: 'rect', x: 200, y: 300, text: '步骤 3', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n2', targetNodeId: 'n3' }
    ]
  }
  return content
}

function umlClassTemplate(): DiagramContent {
  const content = createBlankDiagramContent('UML 类图')
  content.pages[0]!.graphData = {
    nodes: [
      {
        id: 'n1',
        type: 'dg-uml-class',
        x: 160,
        y: 100,
        text: 'User\n—\n+id: string\n+name: string',
        properties: {}
      },
      {
        id: 'n2',
        type: 'dg-uml-interface',
        x: 400,
        y: 100,
        text: '«interface»\nRepository\n—\n+find(id): User',
        properties: {}
      },
      {
        id: 'n3',
        type: 'dg-uml-class',
        x: 280,
        y: 280,
        text: 'UserService\n—\n+getUser(id): User',
        properties: {}
      }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n3', targetNodeId: 'n1', text: 'uses' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n3', targetNodeId: 'n2', text: 'implements' }
    ]
  }
  return content
}

function useCaseTemplate(): DiagramContent {
  const content = createBlankDiagramContent('用例图')
  content.pages[0]!.graphData = {
    nodes: [
      { id: 'n1', type: 'dg-actor', x: 100, y: 180, text: '用户', properties: {} },
      { id: 'n2', type: 'dg-ellipse', x: 300, y: 120, text: '登录', properties: {} },
      { id: 'n3', type: 'dg-ellipse', x: 300, y: 240, text: '下单', properties: {} },
      { id: 'n4', type: 'dg-note', x: 480, y: 120, text: '扩展用例', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n3' }
    ]
  }
  return content
}

function architectureTemplate(): DiagramContent {
  const content = createBlankDiagramContent('系统架构图')
  content.pages[0]!.graphData = {
    nodes: [
      { id: 'n1', type: 'dg-cloud', x: 280, y: 70, text: 'API 网关', properties: {} },
      { id: 'n2', type: 'dg-process', x: 140, y: 200, text: '服务 A', properties: {} },
      { id: 'n3', type: 'dg-process', x: 420, y: 200, text: '服务 B', properties: {} },
      { id: 'n4', type: 'dg-stored-data', x: 280, y: 340, text: '数据库', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n3' },
      { id: 'e3', type: 'polyline', sourceNodeId: 'n2', targetNodeId: 'n4' },
      { id: 'e4', type: 'polyline', sourceNodeId: 'n3', targetNodeId: 'n4' }
    ]
  }
  return content
}

function bpmnSwimlaneTemplate(): DiagramContent {
  const content = createBlankDiagramContent('泳道流程')
  content.pages[0]!.graphData = {
    nodes: [
      {
        id: 'lane1',
        type: 'dg-swimlane',
        x: 300,
        y: 100,
        text: '部门 A',
        properties: { dgLane: true, width: 360, height: 100 }
      },
      {
        id: 'lane2',
        type: 'dg-swimlane',
        x: 300,
        y: 220,
        text: '部门 B',
        properties: { dgLane: true, width: 360, height: 100 }
      },
      { id: 'n1', type: 'dg-terminator', x: 160, y: 100, text: '开始', properties: {} },
      { id: 'n2', type: 'dg-process', x: 300, y: 100, text: '审批', properties: {} },
      { id: 'n3', type: 'dg-xor-gateway', x: 440, y: 100, text: '', properties: {} },
      { id: 'n4', type: 'dg-process', x: 300, y: 220, text: '执行', properties: {} },
      { id: 'n5', type: 'dg-terminator', x: 440, y: 220, text: '结束', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n2', targetNodeId: 'n3' },
      { id: 'e3', type: 'polyline', sourceNodeId: 'n3', targetNodeId: 'n4' },
      { id: 'e4', type: 'polyline', sourceNodeId: 'n4', targetNodeId: 'n5' }
    ]
  }
  return content
}

function radialTemplate(): DiagramContent {
  const content = createBlankDiagramContent('组织架构图')
  content.pages[0]!.graphData = {
    nodes: [
      { id: 'n1', type: 'circle', x: 280, y: 180, text: '中心', properties: {} },
      { id: 'n2', type: 'rect', x: 120, y: 80, text: '分支 A', properties: {} },
      { id: 'n3', type: 'rect', x: 440, y: 80, text: '分支 B', properties: {} },
      { id: 'n4', type: 'rect', x: 120, y: 280, text: '分支 C', properties: {} }
    ],
    edges: [
      { id: 'e1', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n2' },
      { id: 'e2', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n3' },
      { id: 'e3', type: 'polyline', sourceNodeId: 'n1', targetNodeId: 'n4' }
    ]
  }
  return content
}

export function listDiagramTemplates(): DiagramTemplate[] {
  return templates
}

export function getDiagramTemplate(id: string): DiagramTemplate | undefined {
  return templates.find((t) => t.id === id)
}
