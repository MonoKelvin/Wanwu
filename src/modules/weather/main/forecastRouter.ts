/**
 * 天气拉取路由：按 locale 与定位能力选择数据源，国内优先 NMC 实况，国际优先 Open-Meteo。
 * 不再对前两名盲目 Promise.any 竞速，避免 Open-Meteo 与 NMC 不一致时图标错误。
 */
import type { ResolvedWeatherLocation, WeatherSnapshot } from '@modules/weather/domain/types'
import {
  getWeatherForecastChain,
  type WeatherForecastProviderId
} from '@modules/weather/domain/providerChains'
import type { WeatherForecastPayload } from '@modules/weather/domain/providerTypes'
import { buildWeatherSnapshot } from '@modules/weather/domain/weatherPresentation'
import { getLocaleCountryCode } from '@modules/weather/domain/localeCountry'
import {
  getForecastProvider,
  isValidForecastPayload
} from '@modules/weather/main/providers/forecastProviders'

let lastSuccessfulProviderId: WeatherForecastProviderId | null = null

function hasValidCoords(location: ResolvedWeatherLocation): boolean {
  const { latitude, longitude } = location
  return Number.isFinite(latitude) && Number.isFinite(longitude) && !(latitude === 0 && longitude === 0)
}

function canUseProvider(id: WeatherForecastProviderId, location: ResolvedWeatherLocation): boolean {
  if (id === 'nmc-cma') return Boolean(location.nmcStationCode?.trim())
  if (id === 'open-meteo' || id === 'wttr') return hasValidCoords(location)
  return true
}

/** 国内：NMC 站点可用时优先；国际：坐标可用时 Open-Meteo 优先 */
function buildProviderOrder(location: ResolvedWeatherLocation): WeatherForecastProviderId[] {
  const chain = [...getWeatherForecastChain()]
  const isCn = getLocaleCountryCode() === 'CN'
  const hasNmc = Boolean(location.nmcStationCode?.trim())
  const hasCoords = hasValidCoords(location)

  let ordered: WeatherForecastProviderId[]

  if (isCn && hasNmc) {
    ordered = ['nmc-cma', 'open-meteo', 'wttr'].filter((id) => canUseProvider(id, location))
  } else if (hasCoords) {
    ordered = ['open-meteo', 'wttr', ...(hasNmc ? (['nmc-cma'] as const) : [])].filter((id) =>
      chain.includes(id as WeatherForecastProviderId)
    ) as WeatherForecastProviderId[]
    if (!ordered.length) ordered = chain.filter((id) => canUseProvider(id, location))
  } else {
    ordered = chain.filter((id) => canUseProvider(id, location))
  }

  if (lastSuccessfulProviderId && ordered.includes(lastSuccessfulProviderId)) {
    const rest = ordered.filter((id) => id !== lastSuccessfulProviderId)
    return [lastSuccessfulProviderId, ...rest]
  }
  return ordered
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
  const ordered = buildProviderOrder(location)
  if (!ordered.length) {
    throw new Error('无可用天气数据源')
  }

  let lastError: unknown
  for (const id of ordered) {
    try {
      const result = await tryProvider(id, location)
      lastSuccessfulProviderId = result.providerId
      return buildWeatherSnapshot(location, result.payload, result.providerId)
    } catch (err) {
      lastError = err
    }
  }

  throw lastError instanceof Error ? lastError : new Error('天气数据获取失败')
}
