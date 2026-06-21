import { app, ipcMain, session } from 'electron'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { configureLocaleCountryResolver } from '@modules/weather/domain/localeCountry'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'
import type { WeatherCoordinates } from '@modules/weather/domain/types'
import type { DatabaseService } from '../../../../electron/services/core/database'
import {
  bindWeatherSchedulerContext,
  handleWeatherSettingsChanged,
  runInitialWeatherRefresh,
  stopWeatherRefreshSchedule
} from '@modules/weather/main/scheduler'
import { createWeatherService, type WeatherService } from '@modules/weather/main/weatherService'

/** 主进程启动时注入 Electron locale 读取，供 providerChains / 定位链选择 */
function readElectronLocaleCountry(): string {
  if (typeof app.getLocaleCountryCode === 'function') {
    const code = app.getLocaleCountryCode()
    if (code) return code.toUpperCase()
  }
  const locale = app.getLocale()
  const parts = locale.split(/[-_]/)
  if (parts.length >= 2) return parts[parts.length - 1].toUpperCase()
  return 'CN'
}

configureLocaleCountryResolver(readElectronLocaleCountry)

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<WeatherService>(ctx, WEATHER_MODULE_ID)
}

let geolocationPermissionInstalled = false

/** 允许渲染进程使用系统 geolocation（Windows 上默认会被拒绝） */
function ensureGeolocationPermission(): void {
  if (geolocationPermissionInstalled) return
  geolocationPermissionInstalled = true
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(permission === 'geolocation')
  })
}

/** 天气模块主进程入口：服务注册、定时刷新、IPC */
export const weatherMainModule: IMainProcessModule = {
  id: WEATHER_MODULE_ID,
  order: 20,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db?.getAppSettings) return
    setModuleRuntimeService(
      ctx,
      WEATHER_MODULE_ID,
      createWeatherService({
        getRawSettings: () => db.getAppSettings()
      })
    )
  },

  async onModulesReady(ctx) {
    ensureGeolocationPermission()
    bindWeatherSchedulerContext(ctx)
    await runInitialWeatherRefresh()
  },

  onSettingsChanged(ctx, settings) {
    bindWeatherSchedulerContext(ctx)
    handleWeatherSettingsChanged(settings)
  },

  onDispose() {
    stopWeatherRefreshSchedule()
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('weather:getSnapshot', () => getService(ctx)?.getSnapshot() ?? null)

    ipcMain.handle('weather:refresh', () => getService(ctx)?.refresh({ reason: 'ui' }) ?? null)

    ipcMain.handle('weather:sync', () => {
      const service = getService(ctx)
      service?.syncToRenderer()
      return service?.getSnapshot() ?? null
    })

    ipcMain.handle('weather:adoptCoordinates', async (_e, coords: WeatherCoordinates) => {
      const service = getService(ctx)
      if (!service) return null
      return service.adoptCoordinates(coords)
    })
  }
}
