import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'

export const quickAccessAppModule: IAppModule = {
  id: 'wanwu.quick-access',

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
