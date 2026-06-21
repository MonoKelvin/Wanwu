/** window.wanwu.weather 类型增强（preload 实现见 main/preloadApi.ts） */
import type { WeatherCoordinates, WeatherSnapshot } from '@modules/weather/domain/types'

export interface WanwuWeatherApi {
  weather: {
    getSnapshot(): Promise<WeatherSnapshot | null>
    refresh(): Promise<WeatherSnapshot | null>
    adoptCoordinates(coords: WeatherCoordinates): Promise<WeatherSnapshot | null>
    onUpdated(listener: (snapshot: WeatherSnapshot | null) => void): () => void
    onRefreshing(listener: () => void): () => void
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuWeatherApi {}
}

export {}
