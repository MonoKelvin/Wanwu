/** 第三方数据源链配置：按系统 locale 区分国内 / 国际优先级 */
import { getLocaleCountryCode } from '@modules/weather/domain/localeCountry'

/** 国际天气数据链 */
export const WEATHER_FORECAST_CHAIN_INTL = ['open-meteo', 'wttr'] as const

/** 国内天气数据链（中央气象台优先） */
export const WEATHER_FORECAST_CHAIN_CN = ['nmc-cma', 'open-meteo', 'wttr'] as const

export type WeatherForecastProviderId =
  | (typeof WEATHER_FORECAST_CHAIN_INTL)[number]
  | (typeof WEATHER_FORECAST_CHAIN_CN)[number]

/** 按系统 locale 返回天气数据链 */
export function getWeatherForecastChain(): readonly WeatherForecastProviderId[] {
  return getLocaleCountryCode() === 'CN'
    ? WEATHER_FORECAST_CHAIN_CN
    : WEATHER_FORECAST_CHAIN_INTL
}

/** 国际 IP 定位链 */
export const WEATHER_IP_GEO_CHAIN_INTL = [
  'geojs',
  'freeipapi',
  'ip-api',
  'bigdatacloud-ip'
] as const

/** 国内 IP 定位链（太平洋网络优先） */
export const WEATHER_IP_GEO_CHAIN_CN = [
  'pconline',
  'geojs',
  'freeipapi',
  'ip-api',
  'bigdatacloud-ip'
] as const

export type WeatherIpGeoProviderId =
  | (typeof WEATHER_IP_GEO_CHAIN_INTL)[number]
  | (typeof WEATHER_IP_GEO_CHAIN_CN)[number]

/** 按系统 locale 返回 IP 定位链 */
export function getWeatherIpGeoChain(): readonly WeatherIpGeoProviderId[] {
  return getLocaleCountryCode() === 'CN' ? WEATHER_IP_GEO_CHAIN_CN : WEATHER_IP_GEO_CHAIN_INTL
}

/** 逆地理编码接口链（顺序即尝试优先级） */
export const WEATHER_REVERSE_GEO_CHAIN = ['open-meteo', 'bigdatacloud'] as const
