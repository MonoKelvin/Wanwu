import type { DiagramContent } from '@modules/library/diagrams/domain/types'

export function createBlankDiagramContent(title = '未命名流程图'): DiagramContent {
  return {
    format: 'wanwu-diagram',
    formatVersion: 1,
    engine: 'logicflow',
    engineVersion: '2.2.x',
    meta: { title, defaultPageId: 'page-1' },
    pages: [
      {
        id: 'page-1',
        name: '页1',
        sortOrder: 0,
        viewport: { x: 0, y: 0, zoom: 1 },
        graphData: { nodes: [], edges: [] }
      }
    ]
  }
}
