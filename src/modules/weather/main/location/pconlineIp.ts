import { fetchText } from '@modules/weather/main/net/fetchJson'
import { isDistrictLike } from '@modules/weather/domain/placeLabel'
import {
  geocodeCapitalName,
  reverseGeocodeLocation
} from '@modules/weather/main/location/reverseGeocode'
import { resolveNmcStationCode } from '@modules/weather/main/location/nmcStation'
import type { ResolvedWeatherLocation } from '@modules/weather/domain/types'

interface PconlineIpJson {
  ip?: string
  pro?: string
  proCode?: string
  city?: string
  cityCode?: string
  region?: string
  regionCode?: string
  addr?: string
  err?: string
}

function pickAreaFromPconline(data: PconlineIpJson): string {
  const region = data.region?.trim()
  if (region && region !== '0') return region
  const city = data.city?.trim()
  if (city) return city
  return data.pro?.trim() || '未知'
}

function pickCityFromPconline(data: PconlineIpJson, area: string): string | undefined {
  const city = data.city?.trim()
  if (city && city !== area) return city
  return undefined
}

async function refineDistrictLabel(
  latitude: number,
  longitude: number,
  fallback: Pick<ResolvedWeatherLocation, 'area' | 'city'>
): Promise<Pick<ResolvedWeatherLocation, 'area' | 'city'>> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude === 0 || longitude === 0) {
    return fallback
  }
  try {
    const refined = await reverseGeocodeLocation(latitude, longitude, 'ip')
    if (!refined) return fallback
    if (isDistrictLike(refined.area) && refined.city && refined.city !== refined.area) {
      return { area: refined.area, city: refined.city }
    }
  } catch {
    // 保留 IP 粗粒度标签
  }
  return fallback
}

/** 太平洋网络 IP 定位（国内免密钥，GBK JSON） */
export async function tryPconlineIp(): Promise<ResolvedWeatherLocation | null> {
  const text = await fetchText('https://whois.pconline.com.cn/ipJson.jsp?json=true', {
    encoding: 'gbk',
    timeoutMs: 8000
  })
  const data = JSON.parse(text.trim()) as PconlineIpJson
  if (data.err && data.err !== '' && data.err !== 'noprovince') return null
  if (!data.pro?.trim() && !data.city?.trim()) return null

  const region = data.region?.trim()
  let area = pickAreaFromPconline(data)
  let city = pickCityFromPconline(data, area)

  const geocodeQuery = region || data.city?.trim() || data.pro?.trim() || area
  const geocoded = geocodeQuery ? await geocodeCapitalName(geocodeQuery) : null

  if (!region && geocoded) {
    const refined = await refineDistrictLabel(geocoded.latitude, geocoded.longitude, { area, city })
    area = refined.area
    city = refined.city
  }

  const nmcStationCode =
    (await resolveNmcStationCode({
      province: data.pro?.trim() || '',
      city: data.city?.trim() || '',
      region: data.region?.trim()
    })) ?? undefined

  if (!geocoded && !nmcStationCode) return null

  return {
    area,
    city,
    province: data.pro?.trim(),
    latitude: geocoded?.latitude ?? 0,
    longitude: geocoded?.longitude ?? 0,
    source: 'ip',
    nmcStationCode
  }
}
