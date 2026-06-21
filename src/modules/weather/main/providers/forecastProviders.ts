/**
 * 各天气数据源实现：NMC / Open-Meteo / wttr.in，由 forecastRouter 按链调度。
 */
import { resolveWeatherPresentation } from '@modules/weather/domain/weatherCodes'
import type { ResolvedWeatherLocation } from '@modules/weather/domain/types'
import type { WeatherForecastPayload, WeatherForecastProvider } from '@modules/weather/domain/providerTypes'
import { fetchJson } from '@modules/weather/main/net/fetchJson'
import {
  isDayFromSunTimes,
  mapNmcWeatherPresentation
} from '@modules/weather/main/providers/nmcWeatherCodes'

interface ForecastResponse {
  current?: {
    temperature_2m?: number
    weather_code?: number
    is_day?: number
  }
}

function hasValidCoords(location: ResolvedWeatherLocation): boolean {
  const { latitude, longitude } = location
  return Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0)
}

async function fetchNmcCma(
  location: ResolvedWeatherLocation
): Promise<WeatherForecastPayload | null> {
  const stationId = location.nmcStationCode?.trim()
  if (!stationId) return null
  const data = await fetchJson<{
    data?: {
      real?: {
        weather?: { temperature?: number; info?: string; img?: string }
        sun?: { sunrise?: string; sunset?: string }
      }
    }
  }>(`http://www.nmc.cn/rest/weather?stationid=${encodeURIComponent(stationId)}`, {
    timeoutMs: 10000
  })
  const weather = data.data?.real?.weather
  if (!weather || typeof weather.temperature !== 'number') return null
  const sun = data.data?.real?.sun
  const isDay = isDayFromSunTimes(sun?.sunrise, sun?.sunset)
  const { summary, icon, weatherCode } = mapNmcWeatherPresentation(
    weather.info,
    weather.img,
    isDay
  )
  return {
    temperatureC: Math.round(weather.temperature),
    weatherCode,
    summary,
    icon,
    isDay
  }
}

async function fetchOpenMeteo(
  location: ResolvedWeatherLocation
): Promise<WeatherForecastPayload | null> {
  if (!hasValidCoords(location)) return null
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: 'temperature_2m,weather_code,is_day',
    timezone: 'auto'
  })
  const data = await fetchJson<ForecastResponse>(
    `https://api.open-meteo.com/v1/forecast?${params.toString()}`
  )
  const code = data.current?.weather_code ?? -1
  const isDay = data.current?.is_day !== 0
  const { summary, icon } = resolveWeatherPresentation(code, isDay)
  const temp = data.current?.temperature_2m
  if (typeof temp !== 'number') return null
  return {
    temperatureC: Math.round(temp),
    weatherCode: code,
    summary,
    icon,
    isDay
  }
}

/** wttr.in 天气码 → 近似 WMO 码 */
function wttrCodeToWmo(code: number): number {
  if (code === 113) return 0
  if (code === 116) return 2
  if (code === 119 || code === 122) return 3
  if (code === 143 || code === 248 || code === 260) return 45
  if (code === 263 || code === 266) return 51
  if (code === 281 || code === 284) return 56
  if (code === 293) return 61
  if (code === 296) return 63
  if (code === 299 || code === 302 || code === 305) return 65
  if (code === 308) return 65
  if (code === 311 || code === 314) return 67
  if (code === 317 || code === 320) return 71
  if (code === 323 || code === 326) return 71
  if (code === 329 || code === 332) return 73
  if (code === 335 || code === 338) return 75
  if (code === 350 || code === 362 || code === 365) return 77
  if (code === 368 || code === 371) return 73
  if (code === 374 || code === 377) return 77
  if (code === 386 || code === 389) return 95
  if (code === 392 || code === 395) return 96
  return -1
}

async function fetchWttr(location: ResolvedWeatherLocation): Promise<WeatherForecastPayload | null> {
  if (!hasValidCoords(location)) return null
  const lat = location.latitude.toFixed(4)
  const lon = location.longitude.toFixed(4)
  const data = await fetchJson<{
    current_condition?: Array<{
      temp_C?: string
      weatherCode?: string
      weatherDesc?: Array<{ value?: string }>
      is_day?: string
    }>
  }>(`https://wttr.in/${lat},${lon}?format=j1`, {
    headers: { 'User-Agent': 'curl/7.88.1' },
    timeoutMs: 10000
  })
  const current = data.current_condition?.[0]
  if (!current) return null
  const temp = Number(current.temp_C)
  const wttrCode = Number(current.weatherCode)
  if (!Number.isFinite(temp) || !Number.isFinite(wttrCode)) return null
  const isDay = current.is_day !== '0'
  const wmo = wttrCodeToWmo(wttrCode)
  const { summary, icon } = resolveWeatherPresentation(wmo, isDay)
  const desc = current.weatherDesc?.[0]?.value?.trim()
  return {
    temperatureC: Math.round(temp),
    weatherCode: wmo,
    summary: desc || summary,
    icon,
    isDay
  }
}

const PROVIDERS: Record<
  string,
  (location: ResolvedWeatherLocation) => Promise<WeatherForecastPayload | null>
> = {
  'nmc-cma': fetchNmcCma,
  'open-meteo': fetchOpenMeteo,
  wttr: fetchWttr
}

export function getForecastProvider(id: string): WeatherForecastProvider | null {
  const fetch = PROVIDERS[id]
  if (!fetch) return null
  return { id, fetch }
}

export function isValidForecastPayload(
  payload: WeatherForecastPayload | null
): payload is WeatherForecastPayload {
  return payload != null && payload.temperatureC != null
}
