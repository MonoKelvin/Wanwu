import type { AppSettings } from '@shared/types/settings'
import { QUICK_ACCESS_MODULE_ID } from '@modules/quick-access/domain/moduleId'

export interface QuickAccessModuleSettings {
  dailyWidgetEnabled: boolean
  clipboardAssistEnabled: boolean
}

export const DEFAULT_QUICK_ACCESS_MODULE_SETTINGS: QuickAccessModuleSettings = {
  dailyWidgetEnabled: false,
  clipboardAssistEnabled: false
}

export function normalizeQuickAccessModuleSettings(
  raw: Record<string, unknown> | undefined
): QuickAccessModuleSettings {
  return {
    dailyWidgetEnabled: raw?.dailyWidgetEnabled === true,
    clipboardAssistEnabled: raw?.clipboardAssistEnabled === true
  }
}

export function readQuickAccessModuleSettings(
  appSettings: Pick<AppSettings, 'moduleSettings'>
): QuickAccessModuleSettings {
  const stored = appSettings.moduleSettings?.[QUICK_ACCESS_MODULE_ID]
  return normalizeQuickAccessModuleSettings(stored)
}
