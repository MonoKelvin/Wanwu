import { createRouter, createWebHashHistory } from 'vue-router'
import { setupModulePathMemory } from '@app/router/moduleMemory'
import { useSettingsStore } from '@shared/stores/settings'
import { resolveStartupPath } from '@shared/utils/startupModule'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      name: 'root',
      beforeEnter: async () => {
        const store = useSettingsStore()
        if (!store.loaded) await store.load()
        return { path: resolveStartupPath(store.settings), replace: true }
      },
      component: { template: '<div />' }
    },
    {
      path: '/library/:catId?/:subId?',
      name: 'library',
      component: () => import('@modules/library/LibraryView.vue'),
      meta: { module: 'library', title: '全库' }
    },
    {
      path: '/rss/:feedId?',
      name: 'rss',
      component: () => import('@modules/rss/RssView.vue'),
      meta: { module: 'rss', title: 'RSS' }
    },
    {
      path: '/cloud-abode/:slug?',
      name: 'cloud-abode',
      component: () => import('@modules/cloud-abode/CloudAbodeView.vue'),
      meta: { module: 'cloud-abode', title: '云斋' }
    },
    {
      path: '/personal',
      name: 'personal',
      component: () => import('@modules/personal/PersonalView.vue'),
      meta: { module: 'personal', title: '个人' }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@modules/settings/SettingsView.vue'),
      meta: { module: 'settings', title: '设置' }
    },
    {
      path: '/item/:source/:id',
      name: 'item-detail',
      component: () => import('@features/item/ItemDetailView.vue'),
      meta: { fullscreen: true }
    }
  ]
})

setupModulePathMemory(router)

export default router
