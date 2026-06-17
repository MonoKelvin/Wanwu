import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { CLOUD_ABODE_ENABLED } from '@shared/constants/modules'
import { cloudAbodeChildRoutes } from '@modules/cloud-abode/router'

export const cloudAbodeAppModule: IAppModule = {
  id: 'wanwu.cloud-abode',
  moduleId: 'cloud-abode',

  isModuleEnabled() {
    return CLOUD_ABODE_ENABLED
  },

  getModuleNav() {
    return {
      moduleId: 'cloud-abode',
      label: '云斋',
      icon: 'cloud-abode',
      path: '/cloud-abode',
      order: 40
    }
  },

  loadShellView() {
    return import('@modules/cloud-abode/CloudAbodeView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    if (!CLOUD_ABODE_ENABLED) return []
    return [
      {
        path: '/cloud-abode',
        component: () => import('@modules/cloud-abode/CloudAbodeView.vue'),
        meta: { module: 'cloud-abode', title: '云斋' },
        children: cloudAbodeChildRoutes
      }
    ]
  },

  registerShellTheme(register) {
    register({
      moduleId: 'cloud-abode',
      mainClass: 'bg-transparent'
    })
  }
}
