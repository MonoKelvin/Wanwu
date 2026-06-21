/** 天气模块共享类型：定位、快照、坐标 */
import type { WeatherForecastProviderId } from '@modules/weather/domain/providerChains'
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'

/** 定位来源（用于调试，不含敏感坐标） */
export type WeatherLocationSource = 'geolocation' | 'ip' | 'locale-capital'

/** 主进程解析后的位置（含坐标、展示标签与可选 NMC 站点） */
export interface ResolvedWeatherLocation {
  /** 侧栏展示用区域名（如章贡区、南山区） */
  area: string
  /** 上级城市，用于「市·区」格式展示 */
  city?: string
  /** 省级行政区（国内 NMC 站点匹配用） */
  province?: string
  latitude: number
  longitude: number
  source: WeatherLocationSource
  /** 中央气象台站点 code（国内实况） */
  nmcStationCode?: string
}

export interface WeatherSnapshot {
  /** 展示用区域名（如章贡区、南山区） */
  area: string
  /** 上级城市/地区，供无障碍或调试 */
  city?: string
  temperatureC: number | null
  weatherCode: number
  summary: string
  icon: WeatherIconId
  isDay: boolean
  source: WeatherLocationSource
  /** 本次预报使用的数据源 */
  forecastProvider?: WeatherForecastProviderId
  fetchedAt: number
  error?: string
}

export interface WeatherCoordinates {
  latitude: number
  longitude: number
}
