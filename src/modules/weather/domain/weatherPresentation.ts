/**
 * 天气模块对外统一数据模型：各 Provider 归一化后由此出口，UI 与其它模块只依赖此层。
 */
import type { WeatherForecastProviderId } from '@modules/weather/domain/providerChains'
import type { ResolvedWeatherLocation, WeatherSnapshot } from '@modules/weather/domain/types'
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'
import type { WeatherForecastPayload } from '@modules/weather/domain/providerTypes'

/** 归一化后的天气视图（可供其它模块消费） */
export interface WeatherViewModel {
  placeLabel: string
  area: string
  city?: string
  temperatureC: number | null
  summary: string
  icon: WeatherIconId
  isDay: boolean
  /** WMO 天气码（统一语义） */
  weatherCode: number
  forecastProvider: WeatherForecastProviderId | 'unknown'
  locationSource: WeatherSnapshot['source']
  fetchedAt: number
  error?: string
}

export function formatWeatherPlaceLabel(area: string, city?: string): string {
  const a = area.trim()
  const c = city?.trim()
  if (!c || c === a) return a
  return `${c}·${a}`
}

export function buildWeatherSnapshot(
  location: ResolvedWeatherLocation,
  payload: WeatherForecastPayload,
  forecastProvider: WeatherForecastProviderId
): WeatherSnapshot {
  return {
    area: location.area,
    city: location.city,
    temperatureC: payload.temperatureC,
    weatherCode: payload.weatherCode,
    summary: payload.summary,
    icon: payload.icon,
    isDay: payload.isDay,
    source: location.source,
    forecastProvider,
    fetchedAt: Date.now()
  }
}

export function snapshotToViewModel(snapshot: WeatherSnapshot | null): WeatherViewModel | null {
  if (!snapshot) return null
  return {
    placeLabel: formatWeatherPlaceLabel(snapshot.area, snapshot.city),
    area: snapshot.area,
    city: snapshot.city,
    temperatureC: snapshot.temperatureC,
    summary: snapshot.summary,
    icon: snapshot.icon,
    isDay: snapshot.isDay,
    weatherCode: snapshot.weatherCode,
    forecastProvider: snapshot.forecastProvider ?? 'unknown',
    locationSource: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
    error: snapshot.error
  }
}
