/** window.wanwu.weather 类型增强（preload 实现见 main/preloadApi.ts） */
import type { WeatherCoordinates, WeatherSnapshot } from '@modules/weather/domain/types'

export interface WanwuWeatherApi {
  weather: {
    getSnapshot(): Promise<WeatherSnapshot | null>
    refresh(): Promise<WeatherSnapshot | null>
    /** 将主进程缓存推送给 UI，不发起网络请求 */
    sync(): Promise<WeatherSnapshot | null>
    adoptCoordinates(coords: WeatherCoordinates): Promise<WeatherSnapshot | null>
    onUpdated(listener: (snapshot: WeatherSnapshot | null) => void): () => void
    onRefreshing(listener: () => void): () => void
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuWeatherApi {}
}

export {}
