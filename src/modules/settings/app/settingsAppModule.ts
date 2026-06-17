import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'

export const settingsAppModule: IAppModule = {
  id: 'wanwu.settings',
  moduleId: 'settings',

  getModuleNav() {
    return {
      moduleId: 'settings',
      label: '设置',
      icon: 'settings',
      path: '/settings',
      order: 60
    }
  },

  loadShellView() {
    return import('@modules/settings/SettingsView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/settings',
        name: 'settings',
        component: () => import('@modules/settings/SettingsView.vue'),
        meta: { module: 'settings', title: '设置' }
      }
    ]
  },

  registerSettingsSection(register) {
    register({
      id: 'app',
      label: '应用',
      icon: 'sliders-horizontal',
      order: 0,
      loadPanel: () => import('@modules/settings/sections/SettingsAppSection.vue').then((m) => m.default)
    })
    register({
      id: 'data',
      label: '数据与安全',
      icon: 'database',
      order: 50,
      loadPanel: () => import('@modules/settings/sections/SettingsDataSection.vue').then((m) => m.default)
    })
    register({
      id: 'about',
      label: '关于',
      icon: 'sparkles',
      order: 60,
      loadPanel: () => import('@modules/settings/sections/SettingsAboutSection.vue').then((m) => m.default)
    })
  }
}
