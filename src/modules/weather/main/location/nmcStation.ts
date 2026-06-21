/** 根据省/市/区名称匹配中央气象台站点 code */
import { fetchJson } from '@modules/weather/main/net/fetchJson'
import type { ResolvedWeatherLocation } from '@modules/weather/domain/types'

interface NmcProvince {
  code: string
  name: string
}

interface NmcCity {
  code: string
  province: string
  city: string
  url: string
}

let provincesCache: NmcProvince[] | null = null
const citiesCache = new Map<string, NmcCity[]>()

function normalizeAdminName(name: string): string {
  return name
    .trim()
    .replace(/(壮族自治区|回族自治区|维吾尔自治区|特别行政区|自治区|省|市)$/g, '')
}

async function loadProvinces(): Promise<NmcProvince[]> {
  if (!provincesCache) {
    provincesCache = await fetchJson<NmcProvince[]>('http://www.nmc.cn/rest/province/all')
  }
  return provincesCache
}

async function loadCities(provinceCode: string): Promise<NmcCity[]> {
  const cached = citiesCache.get(provinceCode)
  if (cached) return cached
  const cities = await fetchJson<NmcCity[]>(`http://www.nmc.cn/rest/province/${provinceCode}`)
  citiesCache.set(provinceCode, cities)
  return cities
}

function matchProvince(provinces: NmcProvince[], provinceName: string): NmcProvince | null {
  const target = normalizeAdminName(provinceName)
  if (!target) return null
  return (
    provinces.find((p) => normalizeAdminName(p.name) === target) ??
    provinces.find((p) => p.name.includes(target) || target.includes(normalizeAdminName(p.name))) ??
    null
  )
}

function matchCity(cities: NmcCity[], cityName: string, region?: string): NmcCity | null {
  const cityBase = normalizeAdminName(cityName)
  if (cityBase) {
    const byCity =
      cities.find((c) => normalizeAdminName(c.city) === cityBase) ??
      cities.find((c) => c.city.includes(cityBase) || cityBase.includes(normalizeAdminName(c.city))) ??
      cities.find((c) => c.url.toLowerCase().includes(cityBase.toLowerCase()))
    if (byCity) return byCity
  }
  const regionBase = region ? normalizeAdminName(region) : ''
  if (regionBase) {
    return (
      cities.find((c) => c.city.includes(regionBase) || c.url.includes(regionBase.toLowerCase())) ??
      null
    )
  }
  return null
}

/** 根据省/市/区名称解析中央气象台站点 code */
export async function resolveNmcStationCode(input: {
  province: string
  city: string
  region?: string
}): Promise<string | null> {
  const province = input.province.trim()
  const city = input.city.trim()
  if (!province && !city) return null

  try {
    const provinces = await loadProvinces()
    const prov = matchProvince(provinces, province)
    if (!prov) return null
    const cities = await loadCities(prov.code)
    const hit = matchCity(cities, city, input.region?.trim())
    return hit?.code ?? null
  } catch {
    return null
  }
}

/** 为已解析位置附加 NMC 站点（国内精准天气） */
export async function enrichWithNmcStation(
  location: ResolvedWeatherLocation
): Promise<ResolvedWeatherLocation> {
  if (location.nmcStationCode) return location

  const code = await resolveNmcStationCode({
    province: location.province?.trim() || '',
    city: location.city?.trim() || location.area.trim(),
    region:
      location.city && location.area !== location.city ? location.area.trim() : undefined
  })
  if (!code) return location
  return { ...location, nmcStationCode: code }
}
