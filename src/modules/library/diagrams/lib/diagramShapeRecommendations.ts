import type { DiagramShapeCategory, DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

const POPULAR_SHAPE_IDS = [
  'dg-process',
  'dg-decision-flow',
  'dg-terminator',
  'dg-rect',
  'dg-text',
  'dg-document',
  'dg-swimlane',
  'dg-database'
] as const

const CATEGORY_COMPANIONS: Record<string, string[]> = {
  basic: ['dg-rect', 'dg-round-rect', 'dg-circle', 'dg-ellipse', 'dg-square'],
  flowchart: [
    'dg-process',
    'dg-decision-flow',
    'dg-terminator',
    'dg-document',
    'dg-subprocess',
    'dg-connector'
  ],
  polygon: ['dg-hexagon', 'dg-pentagon', 'dg-star', 'dg-parallelogram'],
  uml: ['dg-uml-class', 'dg-uml-interface', 'dg-actor', 'dg-note'],
  architecture: [
    'dg-cloud',
    'dg-database',
    'dg-server',
    'dg-api',
    'dg-queue',
    'dg-cache',
    'dg-load-balancer',
    'dg-container'
  ],
  bpmn: [
    'dg-bpmn-task',
    'dg-bpmn-gateway',
    'dg-bpmn-start',
    'dg-bpmn-end',
    'dg-bpmn-intermediate',
    'dg-bpmn-lane'
  ],
  annotation: ['dg-text', 'dg-comment', 'dg-callout', 'dg-image', 'dg-note']
}

function shapeCategoryMap(categories: DiagramShapeCategory[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const cat of categories) {
    for (const item of cat.items) {
      map.set(item.id, cat.id)
    }
  }
  return map
}

/** 根据最近使用与分类关联，生成智能推荐图元列表 */
export function getRecommendedShapes(
  categories: DiagramShapeCategory[],
  recentIds: string[],
  limit = 8
): DiagramShapeItem[] {
  const byId = new Map<string, DiagramShapeItem>(
    categories.flatMap((c) => c.items).map((item) => [item.id, item])
  )
  const catByShape = shapeCategoryMap(categories)
  const scores = new Map<string, number>()

  const bump = (id: string, weight: number) => {
    if (!byId.has(id)) return
    scores.set(id, (scores.get(id) ?? 0) + weight)
  }

  for (const id of POPULAR_SHAPE_IDS) bump(id, 1)

  for (const [index, id] of recentIds.entries()) {
    bump(id, 6 - Math.min(index, 5))
    const catId = catByShape.get(id)
    if (catId) {
      for (const companion of CATEGORY_COMPANIONS[catId] ?? []) {
        bump(companion, 2)
      }
    }
  }

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => byId.get(id)!)
    .filter(Boolean)
    .slice(0, limit)
}
