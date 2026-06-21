/**
 * 经纬度逆解析与正向 Geocoding，按 WEATHER_REVERSE_GEO_CHAIN 顺序尝试。
 */
import { fetchJson } from '@modules/weather/main/net/fetchJson'
import { WEATHER_REVERSE_GEO_CHAIN } from '@modules/weather/domain/providerChains'
import type { ResolvedWeatherLocation } from '@modules/weather/domain/types'
import type { WeatherLocationSource } from '@modules/weather/domain/types'
import { isDistrictLike } from '@modules/weather/domain/placeLabel'
import { pickAreaLabel, pickCityLabel, type GeocodeHit } from '@modules/weather/main/location/geoLabels'

function toResolved(
  hit: GeocodeHit,
  lat: number,
  lon: number,
  source: WeatherLocationSource
): ResolvedWeatherLocation {
  return {
    area: pickAreaLabel(hit),
    city: pickCityLabel(hit),
    province: hit.admin1?.trim(),
    latitude: lat,
    longitude: lon,
    source
  }
}

async function reverseOpenMeteo(
  latitude: number,
  longitude: number,
  source: WeatherLocationSource
): Promise<ResolvedWeatherLocation | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1&language=zh`
  const data = await fetchJson<{ results?: GeocodeHit[] }>(url)
  const hit = data.results?.[0]
  if (!hit) return null
  return toResolved(hit, latitude, longitude, source)
}

async function reverseBigDataCloud(
  latitude: number,
  longitude: number,
  source: WeatherLocationSource
): Promise<ResolvedWeatherLocation | null> {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=zh`
  const data = await fetchJson<{
    locality?: string
    city?: string
    principalSubdivision?: string
  }>(url)
  const hit: GeocodeHit = {
    name: data.locality?.trim() || data.city?.trim() || '',
    admin1: data.principalSubdivision?.trim(),
    admin2: data.city?.trim(),
    admin3: data.locality?.trim()
  }
  if (!hit.name) return null
  return toResolved(hit, latitude, longitude, source)
}

const REVERSE_PROVIDERS = {
  'open-meteo': reverseOpenMeteo,
  bigdatacloud: reverseBigDataCloud
} as const

function pickBestReverseResult(results: ResolvedWeatherLocation[]): ResolvedWeatherLocation | null {
  if (!results.length) return null
  const withDistrict = results.find(
    (item) => isDistrictLike(item.area) && item.city && item.city !== item.area
  )
  return withDistrict ?? results[0] ?? null
}

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  source: WeatherLocationSource
): Promise<ResolvedWeatherLocation | null> {
  const results: ResolvedWeatherLocation[] = []
  for (const id of WEATHER_REVERSE_GEO_CHAIN) {
    try {
      const resolved = await REVERSE_PROVIDERS[id](latitude, longitude, source)
      if (resolved) results.push(resolved)
    } catch {
      // 尝试下一个逆地理源
    }
  }
  return pickBestReverseResult(results)
}

/** 按城市名正向 Geocoding（locale 首都兜底） */
export async function geocodeCapitalName(name: string): Promise<ResolvedWeatherLocation | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh`
  const data = await fetchJson<{
    results?: Array<GeocodeHit & { latitude: number; longitude: number }>
  }>(url)
  const hit = data.results?.[0]
  if (!hit) return null
  return toResolved(hit, hit.latitude, hit.longitude, 'locale-capital')
}

/** 根据 IP 返回的粗粒度地名构造展示标签 */
export function locationFromIpHint(
  ip: { latitude: number; longitude: number; city?: string; region?: string },
  source: WeatherLocationSource = 'ip'
): ResolvedWeatherLocation | null {
  const prefecture = ip.city?.trim()
  const region = ip.region?.trim()
  if (!prefecture && !region) return null

  if (region && isDistrictLike(region) && prefecture) {
    return {
      area: region,
      city: prefecture,
      latitude: ip.latitude,
      longitude: ip.longitude,
      source
    }
  }

  return {
    area: prefecture || region!,
    city: undefined,
    latitude: ip.latitude,
    longitude: ip.longitude,
    source
  }
}
