import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'
import { recordRecentShape } from '@modules/library/diagrams/lib/diagramRecentShapes'

export function useDiagramRecentShapes() {
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)

  const recentIds = computed(() => settings.value.diagramRecentShapes)

  function record(shapeId: string) {
    recordRecentShape(shapeId)
  }

  return { recentIds, record }
}
