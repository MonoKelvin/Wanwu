import type { AppSettings } from '@shared/types/settings'
import { DIAGRAMS_MODULE_ID } from '@modules/library/diagrams/domain/moduleId'
import {
  MAX_RECENT_DIAGRAM_SHAPES,
  normalizeRecentStringList
} from '@shared/lib/recentPreferences'

export interface DiagramsModuleSettings {
  recentShapes: string[]
}

export const DEFAULT_DIAGRAMS_MODULE_SETTINGS: DiagramsModuleSettings = {
  recentShapes: []
}

export function normalizeDiagramsModuleSettings(
  raw: Record<string, unknown> | undefined
): DiagramsModuleSettings {
  const fromModule = raw?.recentShapes ?? raw?.diagramRecentShapes
  return {
    recentShapes: normalizeRecentStringList(fromModule, MAX_RECENT_DIAGRAM_SHAPES)
  }
}

export function readDiagramsModuleSettings(
  appSettings: Pick<AppSettings, 'moduleSettings'>
): DiagramsModuleSettings {
  const stored = appSettings.moduleSettings?.[DIAGRAMS_MODULE_ID]
  return normalizeDiagramsModuleSettings(stored)
}
