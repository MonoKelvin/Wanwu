/** 国内 NMC weather.img 码与日出日落 → WMO 码 / 图标 */
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'
import { resolveWeatherPresentation } from '@modules/weather/domain/weatherCodes'

/** 中央气象台 weather.img 码 → 图标与摘要 */
export function mapNmcWeatherPresentation(
  info: string | undefined,
  img: string | undefined,
  isDay: boolean
): { summary: string; icon: WeatherIconId; weatherCode: number } {
  const summary = info?.trim() || '—'
  const code = img?.trim() ?? ''
  const wmo = nmcImgToWmo(code, summary)
  const { icon } = resolveWeatherPresentation(wmo, isDay)
  return { summary, icon, weatherCode: wmo }
}

function nmcImgToWmo(img: string, summary: string): number {
  switch (img) {
    case '0':
      return 0
    case '1':
      return 2
    case '2':
      return 3
    case '3':
      return 80
    case '4':
      return 95
    case '5':
    case '6':
    case '7':
    case '8':
      return 61
    case '9':
      return 65
    case '10':
    case '11':
    case '12':
      return 71
    case '13':
    case '14':
    case '15':
      return 75
    case '16':
    case '17':
    case '18':
      return 96
    case '19':
    case '20':
    case '21':
      return 45
    case '22':
    case '23':
    case '24':
      return 56
    case '25':
    case '26':
      return 77
    default:
      break
  }
  if (/晴/.test(summary)) return 0
  if (/多云/.test(summary)) return 2
  if (/阴/.test(summary)) return 3
  if (/雷/.test(summary)) return 95
  if (/雪/.test(summary)) return 71
  if (/雨/.test(summary)) return 61
  if (/雾|霾/.test(summary)) return 45
  return -1
}

export function isDayFromSunTimes(sunrise?: string, sunset?: string): boolean {
  if (!sunrise || !sunset) return true
  const now = Date.now()
  const rise = Date.parse(sunrise.replace(/-/g, '/'))
  const set = Date.parse(sunset.replace(/-/g, '/'))
  if (!Number.isFinite(rise) || !Number.isFinite(set)) return true
  return now >= rise && now < set
}
