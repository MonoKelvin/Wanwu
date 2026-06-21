import { MAX_RECENT_DIAGRAM_SHAPES, normalizeRecentStringList } from '@shared/lib/recentPreferences'
import { useSettingsStore } from '@shared/stores/settings'
import { DIAGRAMS_MODULE_ID } from '@modules/library/diagrams/domain/moduleId'

const LEGACY_DIAGRAM_RECENT_SHAPES_KEY = 'wanwu.diagram.recentShapes'

function readLegacyDiagramRecentShapes(): string[] {
  try {
    const raw = localStorage.getItem(LEGACY_DIAGRAM_RECENT_SHAPES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return normalizeRecentStringList(parsed, MAX_RECENT_DIAGRAM_SHAPES)
  } catch {
    return []
  }
}

function clearLegacyDiagramRecentShapes(): void {
  try {
    localStorage.removeItem(LEGACY_DIAGRAM_RECENT_SHAPES_KEY)
  } catch {
    /* ignore */
  }
}

/** 将 localStorage 中的流程图最近形状迁移到 moduleSettings */
export async function migrateLegacyDiagramSettings(): Promise<void> {
  const settingsStore = useSettingsStore()
  if (!settingsStore.loaded) {
    await settingsStore.load()
  }

  const stored = settingsStore.settings.moduleSettings?.[DIAGRAMS_MODULE_ID]?.recentShapes
  const hasDiagramShapes = Array.isArray(stored) && stored.length > 0
  if (hasDiagramShapes) return

  const legacy = readLegacyDiagramRecentShapes()
  if (!legacy.length) return

  clearLegacyDiagramRecentShapes()
  await settingsStore.patchModuleSettings(DIAGRAMS_MODULE_ID, { recentShapes: legacy })
}
