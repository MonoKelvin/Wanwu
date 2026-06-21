/** 侧栏天气：注册 sidebarFooter、设置分组与样式 */
import type { IAppModule } from '@app/modules/types'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'
import { readWeatherModuleSettings } from '@modules/weather/domain/settings'

export const weatherAppModule: IAppModule = {
  id: WEATHER_MODULE_ID,

  registerSidebarFooter(register) {
    register({
      id: 'weather',
      order: 10,
      isEnabled(ctx) {
        return !ctx.isFullscreen && readWeatherModuleSettings(ctx.settings).enabled
      },
      loadComponent: () =>
        import('@modules/weather/components/WeatherSidebarWidget.vue').then((m) => m.default)
    })
  },

  registerAppSettingsGroup(register) {
    register({
      id: 'weather',
      label: '侧栏天气',
      order: 50,
      loadPanel: () =>
        import('@modules/weather/settings/WeatherAppSettingsGroup.vue').then((m) => m.default)
    })
  },

  registerMainAppIntegration(register) {
    register(() => {
      void import('@modules/weather/styles/weather-sidebar.css')
    })
  }
}
