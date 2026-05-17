import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: '/library' },
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
      path: '/custom/:catId?',
      name: 'custom',
      component: () => import('@modules/custom/CustomView.vue'),
      meta: { module: 'custom', title: '自建' }
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

export default router
