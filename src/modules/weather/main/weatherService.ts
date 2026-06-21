/**
 * 天气服务：持有快照与会话坐标；刷新严格遵循设置中的 weatherRefreshMinutes。
 */
import type { AppSettings } from '@shared/types/settings'
import { normalizeAppSettings } from '@shared/settings/normalizeAppSettings'
import { readWeatherModuleSettings } from '@modules/weather/domain/settings'
import { getMainWindow } from '../../../../electron/windowState'
import type { WeatherCoordinates, WeatherSnapshot } from '@modules/weather/domain/types'
import { fetchWeatherSnapshot } from '@modules/weather/main/forecastRouter'
import { resolveWeatherLocation } from '@modules/weather/main/locationResolver'

export interface WeatherServiceOptions {
  getRawSettings(): Record<string, unknown>
}

export type WeatherRefreshReason = 'schedule' | 'settings' | 'location' | 'ui'

export interface WeatherRefreshOptions {
  /** 忽略刷新间隔，立即拉取 */
  force?: boolean
  reason?: WeatherRefreshReason
}

const COORD_EPSILON = 0.002

function coordsEqual(a: WeatherCoordinates | null, b: WeatherCoordinates): boolean {
  if (!a) return false
  return (
    Math.abs(a.latitude - b.latitude) < COORD_EPSILON &&
    Math.abs(a.longitude - b.longitude) < COORD_EPSILON
  )
}

function isSnapshotStale(
  snapshot: WeatherSnapshot | null,
  intervalMinutes: number,
  now = Date.now()
): boolean {
  if (!snapshot?.fetchedAt) return true
  const intervalMs = intervalMinutes * 60 * 1000
  return now - snapshot.fetchedAt >= intervalMs
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

  private readSettings(): AppSettings {
    return normalizeAppSettings(this.options.getRawSettings())
  }

  private emitUpdated(): void {
    const win = getMainWindow()
    win?.webContents.send('weather:updated', this.snapshot)
  }

  private emitRefreshing(): void {
    const win = getMainWindow()
    win?.webContents.send('weather:refreshing')
  }

  private shouldFetch(settings: AppSettings, options: WeatherRefreshOptions): boolean {
    if (options.force) return true
    if (options.reason === 'settings' || options.reason === 'location') return true
    const weatherSettings = readWeatherModuleSettings(settings)
    return isSnapshotStale(this.snapshot, weatherSettings.refreshMinutes)
  }

  /** 将当前快照推送给渲染进程，不发起网络请求 */
  syncToRenderer(): void {
    this.emitUpdated()
  }

  /**
   * 写入会话坐标；仅当坐标变化或尚无快照时才会在 adoptCoordinates 中触发拉取。
   */
  setSessionCoordinates(coords: WeatherCoordinates): boolean {
    if (!Number.isFinite(coords.latitude) || !Number.isFinite(coords.longitude)) {
      return false
    }
    const changed = !coordsEqual(this.sessionCoordinates, coords)
    this.sessionCoordinates = {
      latitude: coords.latitude,
      longitude: coords.longitude
    }
    return changed
  }

  /** 采纳 geolocation 坐标并按规则刷新 */
  async adoptCoordinates(coords: WeatherCoordinates): Promise<WeatherSnapshot | null> {
    const locationChanged = this.setSessionCoordinates(coords)
    if (locationChanged) {
      return this.refresh({ force: true, reason: 'location' })
    }
    return this.refresh({ reason: 'ui' })
  }

  /** 解析定位 → 拉取天气 → 推送 weather:updated（默认遵守刷新间隔） */
  async refresh(options: WeatherRefreshOptions = {}): Promise<WeatherSnapshot | null> {
    const settings = this.readSettings()
    if (!readWeatherModuleSettings(settings).enabled) {
      this.snapshot = null
      this.emitUpdated()
      return null
    }

    if (!this.shouldFetch(settings, options)) {
      this.syncToRenderer()
      return this.snapshot
    }

    if (this.refreshing) return this.snapshot

    this.refreshing = true
    this.emitRefreshing()
    try {
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
