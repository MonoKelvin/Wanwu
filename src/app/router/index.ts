import { createRouter, createWebHashHistory } from 'vue-router'
import { setupModulePathMemory } from '@app/router/moduleMemory'
import { setupShellNavigationHooks } from '@app/composables/shellNavigation'
import { collectModuleRoutes } from '@app/modules/moduleRegistry'
import { useSettingsStore } from '@shared/stores/settings'
import { resolveStartupPath } from '@shared/utils/startupModule'

const moduleRoutes = collectModuleRoutes()
if (import.meta.env.DEV && moduleRoutes.length === 0) {
  console.error('[router] 未收集到任何模块路由，界面将无法正常显示')
}

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'root',
      beforeEnter: async () => {
        try {
          const store = useSettingsStore()
          if (!store.loaded) await store.load()
          return { path: resolveStartupPath(store.settings), replace: true }
        } catch (err) {
          console.error('[router] 启动重定向失败，回退到 /library', err)
          return { path: '/library', replace: true }
        }
      },
      component: { template: '<div />' }
    },
    ...moduleRoutes
  ]
})

setupModulePathMemory(router)
setupShellNavigationHooks(router)

export default router
