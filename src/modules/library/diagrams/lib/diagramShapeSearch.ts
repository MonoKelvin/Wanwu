import type { DiagramShapeCategory } from '@modules/library/diagrams/lib/diagramShapeRegistry'

export function filterShapeCategories(
  categories: DiagramShapeCategory[],
  query: string
): DiagramShapeCategory[] {
  const q = query.trim().toLowerCase()
  if (!q) return categories
  return categories
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.lfType.toLowerCase().includes(q)
      )
    }))
    .filter((cat) => cat.items.length > 0)
}

