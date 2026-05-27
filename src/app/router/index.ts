import { createRouter, createWebHashHistory } from 'vue-router'
import { setupModulePathMemory } from '@app/router/moduleMemory'
import { useSettingsStore } from '@shared/stores/settings'
import { resolveStartupPath } from '@shared/utils/startupModule'
import { isLibraryMajorId } from '@modules/library/core/config/majors'

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
      path: '/library/:legacyCat/:legacySub?',
      redirect: (to) => {
        const cat = String(to.params.legacyCat ?? '')
        if (isLibraryMajorId(cat)) {
          if (cat === 'links') {
            return {
              name: 'library-links',
              params: { folderId: to.params.legacySub as string | undefined }
            }
          }
          return {
            name: 'library-illustrated-handbook',
            params: {
              catId: to.params.legacySub as string | undefined,
              subId: undefined
            }
          }
        }
        const sub = to.params.legacySub as string | undefined
        return {
          name: 'library-illustrated-handbook',
          params: { catId: cat, subId: sub }
        }
      }
    },
    {
      path: '/library',
      component: () => import('@modules/library/LibraryShellView.vue'),
      meta: { module: 'library', title: '全库' },
      children: [
        {
          path: '',
          redirect: { name: 'library-illustrated-handbook' }
        },
        {
          path: 'illustrated-handbook/:catId?/:subId?',
          name: 'library-illustrated-handbook',
          component: () =>
            import('@modules/library/illustrated-handbook/views/IllustratedHandbookView.vue'),
          meta: { module: 'library', major: 'illustrated-handbook', title: '图鉴' }
        },
        {
          path: 'links/:folderId?',
          name: 'library-links',
          component: () => import('@modules/library/links/views/LinksView.vue'),
          meta: { module: 'library', major: 'links', title: '链接' }
        }
      ]
    },
    {
      path: '/rss/:feedId?',
      name: 'rss',
      component: () => import('@modules/rss/RssView.vue'),
      meta: { module: 'rss', title: 'RSS' }
    },
    {
      path: '/cloud-abode',
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
      component: () => import('@modules/item/ItemDetailView.vue'),
      meta: { fullscreen: true }
    }
  ]
})

setupModulePathMemory(router)

export default router
