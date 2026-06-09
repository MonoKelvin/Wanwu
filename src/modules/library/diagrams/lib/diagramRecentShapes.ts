import { useSettingsStore } from '@shared/stores/settings'

export function recordRecentShape(shapeId: string): void {
  const id = shapeId.trim()
  if (!id) return
  void useSettingsStore().appendDiagramRecentShape(id)
}
