import type { RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { initPersonalProfileSession } from '@modules/personal/composables/personalProfileSession'
import { flushPersonalBeforeNavigation } from '@modules/personal/lib/personalNavigationLifecycle'

initPersonalProfileSession()

export const personalAppModule: IAppModule = {
  id: 'wanwu.personal',
  moduleId: 'personal',

  getModuleNav() {
    return {
      moduleId: 'personal',
      label: '个人',
      icon: 'user',
      path: '/personal',
      order: 50
    }
  },

  loadShellView() {
    return import('@modules/personal/PersonalView.vue').then((m) => m.default)
  },

  registerNavigation(register) {
    register({
      id: 'wanwu.personal.profile',
      teardownBeforeNavigation: flushPersonalBeforeNavigation
    })
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/personal',
        name: 'personal',
        component: () => import('@modules/personal/PersonalView.vue'),
        meta: { module: 'personal', title: '个人' }
      }
    ]
  }
}
