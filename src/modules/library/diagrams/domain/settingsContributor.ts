import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { DIAGRAMS_MODULE_ID } from '@modules/library/diagrams/domain/moduleId'
import { normalizeDiagramsModuleSettings } from '@modules/library/diagrams/domain/settings'

registerSettingsContributor({
  moduleId: DIAGRAMS_MODULE_ID,
  order: 40,
  migrateLegacy(raw) {
    if (!('diagramRecentShapes' in raw)) return null
    return { recentShapes: raw.diagramRecentShapes }
  },
  normalize(stored) {
    return normalizeDiagramsModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeDiagramsModuleSettings({ ...current, ...patch }) as unknown as Record<
      string,
      unknown
    >
  }
})
