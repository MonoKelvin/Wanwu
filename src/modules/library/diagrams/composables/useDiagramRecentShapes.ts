import { ref } from 'vue'
import {
  loadRecentShapeIds,
  recordRecentShape
} from '@modules/library/diagrams/lib/diagramRecentShapes'

const recentIds = ref<string[]>(loadRecentShapeIds())

export function useDiagramRecentShapes() {
  function record(shapeId: string) {
    recordRecentShape(shapeId)
    recentIds.value = loadRecentShapeIds()
  }

  function refresh() {
    recentIds.value = loadRecentShapeIds()
  }

  return { recentIds, record, refresh }
}
