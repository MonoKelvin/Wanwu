import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import {
  collectLibraryChildRoutes,
  getLibraryHomeRouteName,
  resolveFallbackLegacyLibraryPath,
  resolveModuleLegacyLibraryPath
} from '@app/modules/moduleRegistryCore'
import { isLibraryMajorId } from '@modules/library/core/config/majors'

export const libraryAppModule: IAppModule = {
  id: 'wanwu.library.shell',
  moduleId: 'library',

  getModuleNav() {
    return {
      moduleId: 'library',
      label: '全库',
      icon: 'database',
      path: '/library',
      order: 10
    }
  },

  loadShellView() {
    return import('@modules/library/LibraryShellView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    const libraryHomeRouteName = getLibraryHomeRouteName() ?? 'library-links'
    return [
      {
        path: '/library/:legacyCat/:legacySub?',
        redirect: (to) => {
          const cat = String(to.params.legacyCat ?? '')
          const sub = to.params.legacySub as string | undefined
          if (isLibraryMajorId(cat)) {
            const modulePath = resolveModuleLegacyLibraryPath(cat, sub)
            if (modulePath) return modulePath
          }
          const fallback = resolveFallbackLegacyLibraryPath(cat, sub)
          if (fallback) return fallback
          return { name: libraryHomeRouteName }
        }
      },
      {
        path: '/library',
        component: () => import('@modules/library/LibraryShellView.vue'),
        meta: { module: 'library', title: '全库' },
        children: [
          {
            path: '',
            redirect: { name: libraryHomeRouteName }
          },
          ...collectLibraryChildRoutes()
        ]
      }
    ]
  },

  registerSubPanel(register) {
    register({
      moduleId: 'library',
      loadComponent: () =>
        import('@modules/library/core/components/LibraryCategoryPanel.vue').then((m) => m.default)
    })
  }
}
