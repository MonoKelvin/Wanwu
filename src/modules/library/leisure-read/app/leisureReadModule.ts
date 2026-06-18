import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import {
  LEISURE_READ_PATH,
  LIBRARY_LEISURE_READ_ROUTE
} from '@modules/library/leisure-read/domain/routes'

export const leisureReadAppModule: IAppModule = {
  id: 'wanwu.leisure-read',

  getLibraryChildRoutes(): RouteRecordRaw[] {
    return [
      {
        path: 'leisure-read',
        name: LIBRARY_LEISURE_READ_ROUTE,
        component: () =>
          import('@modules/library/leisure-read/views/LeisureReadView.vue').then((m) => m.default),
        meta: { module: 'library', major: 'leisure-read', title: '闲读' }
      }
    ]
  },

  getLibrarySubmodule() {
    return {
      id: 'leisure-read',
      major: {
        id: 'leisure-read',
        name: '闲读',
        icon: 'book-open',
        description: '一言、笑话、急转弯与美文',
        order: 0
      },
      routeName: LIBRARY_LEISURE_READ_ROUTE,
      buildSectionTree() {
        return []
      }
    }
  },

  resolveLegacyLibraryPath(cat): RouteLocationRaw | null {
    if (cat !== 'leisure-read') return null
    return { name: LIBRARY_LEISURE_READ_ROUTE }
  },

  registerLibrarySettingsGroup(register) {
    register({
      id: 'leisure-read',
      label: '闲读',
      order: 5,
      loadPanel: () =>
        import('@modules/library/leisure-read/settings/LeisureReadSettingsPanel.vue').then(
          (m) => m.default
        )
    })
  },

  registerQuickAccess(register) {
    register({
      kind: 'leisure-read',
      paletteMeta: { label: '闲读', icon: 'book-open', order: 15 },
      async open(target, ctx) {
        await ctx.pushRoute({ name: LIBRARY_LEISURE_READ_ROUTE })
        await ctx.afterRouteReady()
        const tab = target.payload?.tab
        if (typeof tab === 'string') {
          const { useLeisureReadStore } = await import(
            '@modules/library/leisure-read/services/leisureReadStore'
          )
          const store = useLeisureReadStore()
          store.activeTab = tab as import('@modules/library/leisure-read/domain/types').LeisureReadTabId
          await store.fetchTab(store.activeTab, true)
        }
        return true
      }
    })
  }
}

export { LEISURE_READ_PATH, LIBRARY_LEISURE_READ_ROUTE }
