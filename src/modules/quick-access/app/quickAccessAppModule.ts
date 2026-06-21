import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { registerAppSettingsGroup } from '@app/modules/appSettingsGroupRegistry'
import { registerAppShellOverlay } from '@app/modules/mainAppRegistry'

export const quickAccessAppModule: IAppModule = {
  id: 'wanwu.quick-access',

  registerAppSettingsGroup(register) {
    register({
      id: 'quick-access',
      label: '快捷访问',
      order: 10,
      loadPanel: () =>
        import('@modules/quick-access/settings/QuickAccessAppSettingsGroup.vue').then((m) => m.default)
    })
  },

  registerMainAppIntegration(register) {
    register(() => {
      registerAppShellOverlay(() =>
        import('@modules/quick-access/app/QuickAccessShell.vue').then((m) => m.default)
      )
    })
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/daily-widget',
        name: 'daily-widget',
        component: () => import('@modules/quick-access/DailyWidgetView.vue'),
        meta: { dailyWidget: true }
      },
      {
        path: '/tray-menu',
        name: 'tray-menu',
        component: () => import('@modules/quick-access/TrayMenuView.vue'),
        meta: { trayMenu: true }
      }
    ]
  }
}
