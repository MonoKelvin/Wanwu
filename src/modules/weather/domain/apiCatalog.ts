/** 设置页「数据接口」展示：从 providerChains 解析链路与元信息 */
import {
  getWeatherForecastChain,
  getWeatherIpGeoChain,
  WEATHER_REVERSE_GEO_CHAIN
} from '@modules/weather/domain/providerChains'

export interface WeatherApiSourceInfo {
  id: string
  name: string
  host: string
  description: string
}

export interface WeatherApiGroup {
  id: string
  label: string
  sources: WeatherApiSourceInfo[]
}

const API_META: Record<string, Omit<WeatherApiSourceInfo, 'id'>> = {
  'nmc-cma': {
    name: '中央气象台',
    host: 'www.nmc.cn',
    description: '国内站点实况气温与天气现象（免密钥）'
  },
  pconline: {
    name: '太平洋网络 IP',
    host: 'whois.pconline.com.cn',
    description: '国内公网 IP 解析省市区（免密钥）'
  },
  'open-meteo': {
    name: 'Open-Meteo',
    host: 'api.open-meteo.com',
    description: 'WMO 天气码与当前气温'
  },
  wttr: {
    name: 'wttr.in',
    host: 'wttr.in',
    description: '按经纬度查询实况，JSON 格式'
  },
  geojs: {
    name: 'GeoJS',
    host: 'get.geojs.io',
    description: '根据公网 IP 估算经纬度'
  },
  freeipapi: {
    name: 'FreeIPAPI',
    host: 'freeipapi.com',
    description: 'HTTPS IP 定位备用'
  },
  'ip-api': {
    name: 'ip-api.com',
    host: 'ip-api.com',
    description: '中文城市名 IP 定位（HTTP 备用）'
  },
  'bigdatacloud-ip': {
    name: 'BigDataCloud · IP',
    host: 'api.bigdatacloud.net',
    description: 'IP 地理定位与 ISP 信息'
  },
  'open-meteo-geo': {
    name: 'Open-Meteo Geocoding',
    host: 'geocoding-api.open-meteo.com',
    description: '经纬度逆解析为行政区（中文）'
  },
  bigdatacloud: {
    name: 'BigDataCloud · Reverse',
    host: 'api.bigdatacloud.net',
    description: '逆地理编码备用（中文 locality）'
  }
}

function toSourceInfo(id: string): WeatherApiSourceInfo {
  const meta = API_META[id]
  if (!meta) return { id, name: id, host: '—', description: '第三方接口' }
  return { id, ...meta }
}

function mapChain(chain: readonly string[]): WeatherApiSourceInfo[] {
  return chain.map((id) => toSourceInfo(id))
}

/** 按当前 locale 解析设置页展示的三组 API 链路 */
export function resolveWeatherApiGroups(): WeatherApiGroup[] {
  return [
    {
      id: 'forecast',
      label: '天气数据',
      sources: mapChain(getWeatherForecastChain())
    },
    {
      id: 'ip-geo',
      label: 'IP 定位',
      sources: mapChain(getWeatherIpGeoChain())
    },
    {
      id: 'reverse-geo',
      label: '逆地理编码',
      sources: WEATHER_REVERSE_GEO_CHAIN.map((id) =>
        toSourceInfo(id === 'open-meteo' ? 'open-meteo-geo' : id)
      )
    }
  ]
}
