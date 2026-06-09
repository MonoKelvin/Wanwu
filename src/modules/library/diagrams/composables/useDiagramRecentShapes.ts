import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@shared/stores/settings'

export function useDiagramRecentShapes() {
  const settingsStore = useSettingsStore()
  const { settings } = storeToRefs(settingsStore)

  const recentIds = computed(() => settings.value.diagramRecentShapes)

  function record(shapeId: string) {
    const id = shapeId.trim()
    if (!id) return
    void settingsStore.appendDiagramRecentShape(id)
  }

  return { recentIds, record }
}
