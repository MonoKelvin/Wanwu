import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { registerAppShellOverlay } from '@app/modules/mainAppRegistry'

export const quickAccessAppModule: IAppModule = {
  id: 'wanwu.quick-access',

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
