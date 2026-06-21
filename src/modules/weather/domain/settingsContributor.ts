import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'
import { normalizeWeatherModuleSettings } from '@modules/weather/domain/settings'

registerSettingsContributor({
  moduleId: WEATHER_MODULE_ID,
  order: 60,
  migrateLegacy(raw) {
    if (!('weatherEnabled' in raw) && !('weatherRefreshMinutes' in raw)) return null
    return {
      enabled: raw.weatherEnabled,
      refreshMinutes: raw.weatherRefreshMinutes
    }
  },
  normalize(stored) {
    return normalizeWeatherModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeWeatherModuleSettings({ ...current, ...patch }) as unknown as Record<string, unknown>
  }
})
