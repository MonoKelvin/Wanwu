/** 各天气数据源返回的标准化预报片段（不含定位信息） */
import type { ResolvedWeatherLocation } from '@modules/weather/domain/types'
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'

export interface WeatherForecastPayload {
  temperatureC: number | null
  weatherCode: number
  summary: string
  icon: WeatherIconId
  isDay: boolean
}

export interface WeatherForecastProvider {
  readonly id: string
  fetch(location: ResolvedWeatherLocation): Promise<WeatherForecastPayload | null>
}
