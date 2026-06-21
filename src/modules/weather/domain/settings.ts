import type { AppSettings } from '@shared/types/settings'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'

export type WeatherRefreshMinutes = 1 | 15 | 30 | 60

export interface WeatherModuleSettings {
  enabled: boolean
  refreshMinutes: WeatherRefreshMinutes
}

export const DEFAULT_WEATHER_MODULE_SETTINGS: WeatherModuleSettings = {
  enabled: true,
  refreshMinutes: 1
}

export const WEATHER_REFRESH_OPTIONS: Array<{ label: string; value: WeatherRefreshMinutes }> = [
  { label: '每 1 分钟', value: 1 },
  { label: '每 15 分钟', value: 15 },
  { label: '每 30 分钟', value: 30 },
  { label: '每 1 小时', value: 60 }
]

function normalizeRefreshMinutes(v: unknown): WeatherRefreshMinutes {
  const minutes = Number(v)
  if (minutes === 1 || minutes === 15 || minutes === 30 || minutes === 60) return minutes
  return 1
}

export function normalizeWeatherModuleSettings(
  raw: Record<string, unknown> | undefined
): WeatherModuleSettings {
  const enabled =
    typeof raw?.enabled === 'boolean'
      ? raw.enabled
      : raw?.weatherEnabled !== false
  return {
    enabled,
    refreshMinutes: normalizeRefreshMinutes(raw?.refreshMinutes ?? raw?.weatherRefreshMinutes)
  }
}

export function readWeatherModuleSettings(
  appSettings: Pick<AppSettings, 'moduleSettings'>
): WeatherModuleSettings {
  const stored = appSettings.moduleSettings?.[WEATHER_MODULE_ID]
  return normalizeWeatherModuleSettings(stored)
}
