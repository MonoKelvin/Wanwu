/** preload 暴露 window.wanwu.weather（IPC 桥接） */
import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'
import type { WeatherCoordinates, WeatherSnapshot } from '@modules/weather/domain/types'

export const weatherPreloadModule: IPreloadModule = {
  id: WEATHER_MODULE_ID,
  order: 20,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      weather: {
        getSnapshot: () => ipcRenderer.invoke('weather:getSnapshot') as Promise<WeatherSnapshot | null>,
        refresh: () => ipcRenderer.invoke('weather:refresh') as Promise<WeatherSnapshot | null>,
        adoptCoordinates: (coords: WeatherCoordinates) =>
          ipcRenderer.invoke('weather:adoptCoordinates', coords) as Promise<WeatherSnapshot | null>,
        onUpdated: (listener: (snapshot: WeatherSnapshot | null) => void) => {
          const handler = (_event: Electron.IpcRendererEvent, snapshot: WeatherSnapshot | null) => {
            listener(snapshot)
          }
          ipcRenderer.on('weather:updated', handler)
          return () => ipcRenderer.removeListener('weather:updated', handler)
        },
        onRefreshing: (listener: () => void) => {
          const handler = () => listener()
          ipcRenderer.on('weather:refreshing', handler)
          return () => ipcRenderer.removeListener('weather:refreshing', handler)
        }
      }
    }
  }
}
