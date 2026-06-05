import type { DiagramContent, DiagramTemplate } from '@shared/types/diagrams'
import { createBlankDiagramContent } from './blankContent'

const templates: DiagramTemplate[] = [
  {
    id: 'tpl-blank',
    name: '空白',
    description: '从零开始绘制',
    content: createBlankDiagramContent()
  },
  {
    id: 'tpl-flow',
    name: '基础流程',
    description: '开始 → 处理 → 结束',
    content: flowTemplate()
  },
  {
    id: 'tpl-decision',
    name: '判断分支',
    description: '带菱形判断节点',
    content: decisionTemplate()
  },
  {
    id: 'tpl-swimlane',
    name: '步骤说明',
    description: '纵向步骤排列',
    content: stepsTemplate()
  },
  {
    id: 'tpl-mind',
    name: '中心发散',
    description: '中心节点 + 分支',
    content: radialTemplate()
  }
]

function flowTemplate(): DiagramContent {
  const content = createBlankDiagramContent('基础流程')
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
  const content = createBlankDiagramContent('判断分支')
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
  const content = createBlankDiagramContent('步骤说明')
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

function radialTemplate(): DiagramContent {
  const content = createBlankDiagramContent('中心发散')
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
