import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { QUICK_ACCESS_MODULE_ID } from '@modules/quick-access/domain/moduleId'
import { normalizeQuickAccessModuleSettings } from '@modules/quick-access/domain/settings'

registerSettingsContributor({
  moduleId: QUICK_ACCESS_MODULE_ID,
  order: 5,
  migrateLegacy(raw) {
    if (!('dailyWidgetEnabled' in raw) && !('clipboardAssistEnabled' in raw)) return null
    return {
      dailyWidgetEnabled: raw.dailyWidgetEnabled,
      clipboardAssistEnabled: raw.clipboardAssistEnabled
    }
  },
  normalize(stored) {
    return normalizeQuickAccessModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeQuickAccessModuleSettings({ ...current, ...patch }) as unknown as Record<
      string,
      unknown
    >
  }
})
