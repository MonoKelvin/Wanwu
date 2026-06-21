/**
 * 天气拉取路由：按 providerChains 顺序尝试，前两名并行竞速，成功后记住优先源。
 */
import type { ResolvedWeatherLocation, WeatherSnapshot } from '@modules/weather/domain/types'
import {
  getWeatherForecastChain,
  type WeatherForecastProviderId
} from '@modules/weather/domain/providerChains'
import type { WeatherForecastPayload } from '@modules/weather/domain/providerTypes'
import {
  getForecastProvider,
  isValidForecastPayload
} from '@modules/weather/main/providers/forecastProviders'

let lastSuccessfulProviderId: WeatherForecastProviderId | null = null

function orderProviderIds(): WeatherForecastProviderId[] {
  const chain = getWeatherForecastChain()
  if (!lastSuccessfulProviderId) return [...chain]
  const rest = chain.filter((id) => id !== lastSuccessfulProviderId)
  return [lastSuccessfulProviderId, ...rest]
}

function mergeSnapshot(
  location: ResolvedWeatherLocation,
  payload: WeatherForecastPayload
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
    fetchedAt: Date.now()
  }
}

async function tryProvider(
  id: WeatherForecastProviderId,
  location: ResolvedWeatherLocation
): Promise<{ providerId: WeatherForecastProviderId; payload: WeatherForecastPayload }> {
  const provider = getForecastProvider(id)
  if (!provider) throw new Error(`unknown provider: ${id}`)
  const payload = await provider.fetch(location)
  if (!isValidForecastPayload(payload)) throw new Error(`${id} invalid payload`)
  return { providerId: id, payload }
}

/** 统一天气拉取入口 */
export async function fetchWeatherSnapshot(
  location: ResolvedWeatherLocation
): Promise<WeatherSnapshot> {
  const ordered = orderProviderIds()
  let lastError: unknown

  if (ordered.length >= 2) {
    const [first, second] = ordered
    try {
      const raced = await Promise.any([
        tryProvider(first, location),
        tryProvider(second, location)
      ])
      lastSuccessfulProviderId = raced.providerId
      return mergeSnapshot(location, raced.payload)
    } catch {
      // 并行均失败，继续顺序尝试
    }
  }

  for (const id of ordered) {
    try {
      const result = await tryProvider(id, location)
      lastSuccessfulProviderId = result.providerId
      return mergeSnapshot(location, result.payload)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('天气数据获取失败')
}
