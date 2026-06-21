/** 从 assets/icons/weather 按主题加载 SVG URL */
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'

export type WeatherIconTheme = 'dark' | 'light'

const iconModules = import.meta.glob<string>('@assets/icons/weather/weather-*.svg', {
  eager: true,
  query: '?url',
  import: 'default'
})

/** key: weather-sun-dark */
const urlByKey = new Map<string, string>()
for (const [path, url] of Object.entries(iconModules)) {
  const filename = path.split('/').pop()?.replace('.svg', '') ?? ''
  if (filename) urlByKey.set(filename, url)
}

export function readAppIconTheme(): WeatherIconTheme {
  if (typeof document === 'undefined') return 'light'
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function resolveAssetKey(id: WeatherIconId, theme: WeatherIconTheme): string {
  const themed = `${id}-${theme}`
  if (urlByKey.has(themed)) return themed
  const fallback = `${id}-${theme === 'dark' ? 'light' : 'dark'}`
  if (urlByKey.has(fallback)) return fallback
  const unknownThemed = `weather-unknown-${theme}`
  if (urlByKey.has(unknownThemed)) return unknownThemed
  return `weather-unknown-light`
}

export function weatherIconUrl(id: WeatherIconId, theme: WeatherIconTheme = readAppIconTheme()): string {
  return urlByKey.get(resolveAssetKey(id, theme)) ?? ''
}
