/**
 * 天气服务：持有快照与会话坐标，响应 refresh / adoptCoordinates IPC。
 */
import type { AppSettings } from '@shared/types/settings'
import { normalizeAppSettings } from '../../../../electron/services/data/settings'
import { getMainWindow } from '../../../../electron/windowState'
import type { WeatherCoordinates, WeatherSnapshot } from '@modules/weather/domain/types'
import { fetchWeatherSnapshot } from '@modules/weather/main/forecastRouter'
import { resolveWeatherLocation } from '@modules/weather/main/locationResolver'

export interface WeatherServiceOptions {
  getRawSettings(): Record<string, unknown>
}

export class WeatherService {
  private snapshot: WeatherSnapshot | null = null
  /** 渲染进程 geolocation 写入的会话坐标，优先于 IP 定位 */
  private sessionCoordinates: WeatherCoordinates | null = null
  private refreshing = false

  constructor(private readonly options: WeatherServiceOptions) {}

  getSnapshot(): WeatherSnapshot | null {
    return this.snapshot
  }

  adoptCoordinates(coords: WeatherCoordinates): void {
    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) return
    this.sessionCoordinates = {
      latitude: coords.latitude,
      longitude: coords.longitude
    }
  }

  private readSettings(): AppSettings {
    return normalizeAppSettings(this.options.getRawSettings())
  }

  private emitUpdated(): void {
    const win = getMainWindow()
    win?.webContents.send('weather:updated', this.snapshot)
  }

  /** 解析定位 → 拉取天气 → 推送 weather:updated */
  async refresh(): Promise<WeatherSnapshot | null> {
    if (this.refreshing) return this.snapshot
    this.refreshing = true
    const win = getMainWindow()
    win?.webContents.send('weather:refreshing')
    try {
      const settings = this.readSettings()
      if (!settings.weatherEnabled) {
        this.snapshot = null
        this.emitUpdated()
        return null
      }

      const location = await resolveWeatherLocation(this.sessionCoordinates)
      this.snapshot = await fetchWeatherSnapshot(location)
      this.emitUpdated()
      return this.snapshot
    } catch (err) {
      const message = err instanceof Error ? err.message : '天气获取失败'
      console.warn('[wanwu] weather refresh failed', err)
      this.snapshot = {
        area: this.snapshot?.area ?? '\u2014',
        city: this.snapshot?.city,
        temperatureC: null,
        weatherCode: -1,
        summary: '\u2014',
        icon: 'weather-unknown',
        isDay: true,
        source: this.snapshot?.source ?? 'locale-capital',
        fetchedAt: Date.now(),
        error: message
      }
      this.emitUpdated()
      return this.snapshot
    } finally {
      this.refreshing = false
    }
  }
}

export function createWeatherService(options: WeatherServiceOptions): WeatherService {
  return new WeatherService(options)
}
