/**
 * 公网 IP 定位：按 providerChains 配置顺序尝试，过滤与 locale 不一致的 VPN 出口。
 */
import { fetchJson } from '@modules/weather/main/net/fetchJson'
import { getLocaleCountryCode, isLikelyProxyIp } from '@modules/weather/domain/localeCountry'
import {
  getWeatherIpGeoChain,
  type WeatherIpGeoProviderId
} from '@modules/weather/domain/providerChains'
import {
  locationFromIpHint,
  reverseGeocodeLocation
} from '@modules/weather/main/location/reverseGeocode'
import { tryPconlineIp } from '@modules/weather/main/location/pconlineIp'
import type { ResolvedWeatherLocation } from '@modules/weather/domain/types'

interface IpGeoResult {
  latitude: number
  longitude: number
  city?: string
  region?: string
  countryCode?: string
}

async function tryGeoJsIp(): Promise<IpGeoResult | null> {
  const data = await fetchJson<{
    latitude?: string
    longitude?: string
    city?: string
    region?: string
    country_code?: string
  }>('https://get.geojs.io/v1/ip/geo.json')
  const latitude = Number(data.latitude)
  const longitude = Number(data.longitude)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  return {
    latitude,
    longitude,
    city: data.city?.trim(),
    region: data.region?.trim(),
    countryCode: data.country_code?.trim()
  }
}

async function tryFreeIpApi(): Promise<IpGeoResult | null> {
  const data = await fetchJson<{
    latitude?: number
    longitude?: number
    cityName?: string
    regionName?: string
    countryCode?: string
  }>('https://freeipapi.com/api/json')
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.cityName?.trim(),
    region: data.regionName?.trim(),
    countryCode: data.countryCode?.trim()
  }
}

async function tryIpApiIp(): Promise<IpGeoResult | null> {
  const data = await fetchJson<{
    status?: string
    city?: string
    lat?: number
    lon?: number
    regionName?: string
    countryCode?: string
  }>('http://ip-api.com/json/?lang=zh-CN&fields=status,city,lat,lon,regionName,countryCode')
  if (data.status !== 'success') return null
  if (typeof data.lat !== 'number' || typeof data.lon !== 'number') return null
  return {
    latitude: data.lat,
    longitude: data.lon,
    city: data.city?.trim(),
    region: data.regionName?.trim(),
    countryCode: data.countryCode?.trim()
  }
}

async function tryBigDataCloudIp(): Promise<IpGeoResult | null> {
  const data = await fetchJson<{
    latitude?: number
    longitude?: number
    city?: string
    principalSubdivision?: string
    countryCode?: string
  }>('https://api.bigdatacloud.net/data/ip-geolocation-with-isp')
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null
  return {
    latitude: data.latitude,
    longitude: data.longitude,
    city: data.city?.trim(),
    region: data.principalSubdivision?.trim(),
    countryCode: data.countryCode?.trim()
  }
}

const INTL_IP_PROVIDERS: Record<
  Exclude<WeatherIpGeoProviderId, 'pconline'>,
  () => Promise<IpGeoResult | null>
> = {
  geojs: tryGeoJsIp,
  freeipapi: tryFreeIpApi,
  'ip-api': tryIpApiIp,
  'bigdatacloud-ip': tryBigDataCloudIp
}

async function resolveIpHit(ip: IpGeoResult): Promise<ResolvedWeatherLocation | null> {
  const reversed = await reverseGeocodeLocation(ip.latitude, ip.longitude, 'ip')
  if (reversed) return reversed
  return locationFromIpHint(ip, 'ip')
}

async function tryIntlIpProvider(id: Exclude<WeatherIpGeoProviderId, 'pconline'>): Promise<ResolvedWeatherLocation | null> {
  const localeCountry = getLocaleCountryCode()
  const ip = await INTL_IP_PROVIDERS[id]()
  if (!ip || isLikelyProxyIp(ip.countryCode, localeCountry)) return null
  return resolveIpHit(ip)
}

export async function resolveFromIp(): Promise<ResolvedWeatherLocation | null> {
  for (const id of getWeatherIpGeoChain()) {
    try {
      if (id === 'pconline') {
        const fromPconline = await tryPconlineIp()
        if (fromPconline) return fromPconline
        continue
      }
      const resolved = await tryIntlIpProvider(id)
      if (resolved) return resolved
    } catch {
      // 尝试链上下一个 IP 定位源
    }
  }
  return null
}
