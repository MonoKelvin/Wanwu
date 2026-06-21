/** 国内 NMC weather.img 码与日出日落 → WMO 码 / 图标 */
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'
import {
  resolveWeatherPresentation,
  resolveWeatherPresentationFromSummary
} from '@modules/weather/domain/weatherCodes'

/** 中央气象台 weather.img 码 → 图标与摘要 */
export function mapNmcWeatherPresentation(
  info: string | undefined,
  img: string | undefined,
  isDay: boolean
): { summary: string; icon: WeatherIconId; weatherCode: number } {
  const summary = info?.trim() || '—'
  const imgCode = normalizeNmcImgCode(img)
  const wmoFromImg = imgCode != null ? nmcImgCodeToWmo(imgCode) : -1
  const wmoFromInfo = nmcSummaryToWmo(summary)

  let wmo = wmoFromImg
  if (wmoFromImg >= 0 && wmoFromInfo >= 0 && !weatherCodesCompatible(wmoFromImg, wmoFromInfo)) {
    wmo = wmoFromInfo
  } else if (wmoFromImg < 0 && wmoFromInfo >= 0) {
    wmo = wmoFromInfo
  } else if (wmoFromImg < 0) {
    wmo = wmoFromInfo
  }

  const fromSummary = resolveWeatherPresentationFromSummary(summary, isDay)
  const fromWmo = resolveWeatherPresentation(wmo, isDay)
  const icon = fromSummary?.icon ?? fromWmo.icon
  return { summary, icon, weatherCode: wmo }
}

/** 剥离昼夜前缀（d00 / n01）并规范为两位现象码 */
export function normalizeNmcImgCode(img: string | undefined): string | null {
  const raw = img?.trim()
  if (!raw) return null
  const stripped = raw.replace(/^[dn]/i, '')
  if (/^\d{1,2}$/.test(stripped)) {
    return stripped.padStart(2, '0')
  }
  return null
}

/** 中央气象台标准现象码（00–53）→ WMO */
function nmcImgCodeToWmo(code: string): number {
  switch (code) {
    case '00':
      return 0
    case '01':
      return 2
    case '02':
      return 3
    case '03':
      return 80
    case '04':
      return 95
    case '05':
      return 96
    case '06':
      return 67
    case '07':
      return 61
    case '08':
      return 63
    case '09':
      return 65
    case '10':
      return 65
    case '11':
    case '12':
      return 82
    case '13':
      return 85
    case '14':
      return 71
    case '15':
      return 73
    case '16':
      return 75
    case '17':
      return 75
    case '18':
      return 45
    case '19':
      return 56
    case '20':
    case '29':
    case '30':
    case '31':
      return 45
    case '21':
    case '22':
      return 63
    case '23':
    case '24':
    case '25':
      return 65
    case '26':
    case '27':
      return 73
    case '28':
      return 75
    case '32':
    case '49':
    case '57':
    case '58':
      return 45
    case '53':
      return 48
    default:
      return -1
  }
}

function nmcSummaryToWmo(summary: string): number {
  if (/晴/.test(summary)) return 0
  if (/多云/.test(summary)) return 2
  if (/阴/.test(summary)) return 3
  if (/雷阵雨|雷暴/.test(summary)) return 95
  if (/冰雹/.test(summary)) return 96
  if (/雨夹雪|冻雨/.test(summary)) return 67
  if (/暴雨|大雨/.test(summary)) return 65
  if (/中雨/.test(summary)) return 63
  if (/小雨|阵雨/.test(summary)) return 61
  if (/暴雪|大雪/.test(summary)) return 75
  if (/中雪/.test(summary)) return 73
  if (/小雪|阵雪/.test(summary)) return 71
  if (/雪/.test(summary)) return 71
  if (/雨/.test(summary)) return 61
  if (/雾|霾|沙尘/.test(summary)) return 45
  return -1
}

/** 同一现象大类视为兼容（如多云 vs 少云） */
function weatherCodesCompatible(a: number, b: number): boolean {
  if (a === b) return true
  const cat = (code: number) => {
    if (code === 0) return 'clear'
    if (code >= 1 && code <= 3) return 'cloud'
    if (code >= 45 && code <= 48) return 'fog'
    if (code >= 51 && code <= 67) return 'rain'
    if (code >= 71 && code <= 77) return 'snow'
    if (code >= 80 && code <= 82) return 'shower'
    if (code >= 85 && code <= 86) return 'snow-shower'
    if (code >= 95 && code <= 99) return 'storm'
    return 'other'
  }
  return cat(a) === cat(b)
}

export function isDayFromSunTimes(sunrise?: string, sunset?: string): boolean {
  if (!sunrise || !sunset) return true
  const now = Date.now()
  const rise = Date.parse(sunrise.replace(/-/g, '/'))
  const set = Date.parse(sunset.replace(/-/g, '/'))
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return true
  return now >= rise && now < set
}
