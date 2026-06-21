/**
 * 天气定位解析：geolocation 坐标 → IP（过滤 VPN）→ 系统 locale 首都。
 * 国内 locale 会附加中央气象台站点 code。
 */
import type { ResolvedWeatherLocation, WeatherCoordinates } from '@modules/weather/domain/types'
import { getLocaleCountryCode } from '@modules/weather/domain/localeCountry'
import { geocodeCapitalName } from '@modules/weather/main/location/reverseGeocode'
import { resolveFromIp } from '@modules/weather/main/location/ipGeo'
import { reverseGeocodeLocation } from '@modules/weather/main/location/reverseGeocode'
import { enrichWithNmcStation } from '@modules/weather/main/location/nmcStation'

/** ISO 3166-1 alpha-2 → 首都名，供 Open-Meteo Geocoding 兜底 */
const LOCALE_CAPITAL_CITY: Record<string, string> = {
  CN: 'Beijing',
  TW: 'Taipei',
  HK: 'Hong Kong',
  MO: 'Macau',
  US: 'Washington',
  GB: 'London',
  JP: 'Tokyo',
  KR: 'Seoul',
  DE: 'Berlin',
  FR: 'Paris',
  IT: 'Rome',
  ES: 'Madrid',
  RU: 'Moscow',
  IN: 'New Delhi',
  AU: 'Canberra',
  CA: 'Ottawa',
  BR: 'Brasilia',
  MX: 'Mexico City',
  SG: 'Singapore',
  MY: 'Kuala Lumpur',
  TH: 'Bangkok',
  VN: 'Hanoi',
  ID: 'Jakarta',
  PH: 'Manila',
  NL: 'Amsterdam',
  SE: 'Stockholm',
  NO: 'Oslo',
  CH: 'Bern',
  AT: 'Vienna',
  PL: 'Warsaw',
  TR: 'Ankara',
  SA: 'Riyadh',
  AE: 'Abu Dhabi',
  IL: 'Jerusalem',
  EG: 'Cairo',
  ZA: 'Cape Town',
  AR: 'Buenos Aires',
  CL: 'Santiago',
  NZ: 'Wellington'
}

const DEFAULT_CAPITAL = 'Beijing'
const DEFAULT_COORDS = { latitude: 39.9042, longitude: 116.4074 }

async function resolveLocaleCapital(): Promise<ResolvedWeatherLocation> {
  const country = getLocaleCountryCode()
  const capital = LOCALE_CAPITAL_CITY[country] ?? DEFAULT_CAPITAL
  const geocoded = await geocodeCapitalName(capital)
  if (geocoded) return geocoded
  return {
    area: capital,
    ...DEFAULT_COORDS,
    source: 'locale-capital'
  }
}

/** 定位优先级：会话 geolocation → IP → locale 首都 */
export async function resolveWeatherLocation(
  sessionCoordinates: WeatherCoordinates | null
): Promise<ResolvedWeatherLocation> {
  let resolved: ResolvedWeatherLocation

  if (sessionCoordinates) {
    const { latitude, longitude } = sessionCoordinates
    const reversed = await reverseGeocodeLocation(latitude, longitude, 'geolocation')
    resolved = reversed ?? {
      area: '当前位置',
      latitude,
      longitude,
      source: 'geolocation'
    }
  } else {
    const fromIp = await resolveFromIp()
    if (fromIp) {
      resolved = fromIp
    } else {
      try {
        resolved = await resolveLocaleCapital()
      } catch (err) {
        console.warn('[wanwu] weather locale capital fallback failed', err)
        resolved = {
          area: DEFAULT_CAPITAL,
          ...DEFAULT_COORDS,
          source: 'locale-capital'
        }
      }
    }
  }

  if (getLocaleCountryCode() === 'CN') {
    resolved = await enrichWithNmcStation(resolved)
  }
  return resolved
}
