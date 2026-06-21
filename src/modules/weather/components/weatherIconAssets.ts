/** 从 assets/icons/weather 按需加载 SVG URL */
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'

const iconModules = import.meta.glob<string>('@assets/icons/weather/weather-*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})

const urlById = new Map<string, string>()
for (const [path, url] of Object.entries(iconModules)) {
  const id = path.split('/').pop()?.replace('.svg', '') ?? ''
  if (id) urlById.set(id, url)
}

export function weatherIconUrl(id: WeatherIconId): string {
  return urlById.get(id) ?? urlById.get('weather-unknown') ?? ''
}
