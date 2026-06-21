/** 后台定时刷新：读取 weatherRefreshMinutes，关闭开关时停止定时器 */
import type { AppSettings } from '@shared/types/settings'
import type { MainProcessInitContext } from '@shared/module-bridge/mainProcessRegistry'
import { getModuleRuntimeService } from '@shared/module-bridge/mainProcessRegistry'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'
import { normalizeAppSettings } from '../../../../electron/services/data/settings'
import type { DatabaseService } from '../../../../electron/services/core/database'
import type { WeatherService } from '@modules/weather/main/weatherService'

let timer: ReturnType<typeof setInterval> | null = null
let ctxRef: MainProcessInitContext | null = null

function getService(): WeatherService | null {
  if (!ctxRef) return null
  return getModuleRuntimeService<WeatherService>(ctxRef, WEATHER_MODULE_ID)
}

export function bindWeatherSchedulerContext(ctx: MainProcessInitContext): void {
  ctxRef = ctx
}

export function applyWeatherRefreshSchedule(settings: AppSettings): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const minutes = settings.weatherRefreshMinutes
  const service = getService()
  if (!settings.weatherEnabled || !service) return
  const ms = minutes * 60 * 1000
  timer = setInterval(() => {
    void service.refresh()
  }, ms)
}

export function stopWeatherRefreshSchedule(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

/** 模块就绪后启动定时器；不在启动时用 IP 预拉取（VPN 会导致错误位置） */
export async function runInitialWeatherRefresh(): Promise<void> {
  const db = ctxRef?.services.db as DatabaseService | null
  if (!db) return
  const settings = normalizeAppSettings(db.getAppSettings() ?? {})
  if (!settings.weatherEnabled) return
  applyWeatherRefreshSchedule(settings)
}
