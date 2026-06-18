import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { Component } from 'vue'
import { watch } from 'vue'
import type { IAppModule } from '@app/modules/types'
import {
  handbookCatalogFromCategories,
  sectionTreeForMajor
} from '@modules/library/core/composables/libraryCategoryTree'
import { isLibraryMajorId } from '@modules/library/core/config/majors'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'
import { useIllustratedHandbookStore } from '@modules/library/illustrated-handbook/services/illustratedHandbookStore'

const HANDBOOK_HOME_ROUTE = 'library-illustrated-handbook'

export const handbookAppModule: IAppModule = {
  id: 'wanwu.library.illustrated-handbook',

  loadItemDetailView(): Promise<Component> {
    return import('@modules/library/illustrated-handbook/item/ItemDetailView.vue').then((m) => m.default)
  },

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/item/:source/:id',
        name: 'item-detail',
        component: () => import('@modules/library/illustrated-handbook/item/ItemDetailView.vue'),
        meta: { fullscreen: true }
      }
    ]
  },

  getLibraryChildRoutes(): RouteRecordRaw[] {
    return [
      {
        path: 'illustrated-handbook/:catId?/:subId?',
        name: 'library-illustrated-handbook',
        component: () =>
          import('@modules/library/illustrated-handbook/views/IllustratedHandbookView.vue'),
        meta: { module: 'library', major: 'illustrated-handbook', title: '图鉴' }
      }
    ]
  },

  getLibrarySubmodule() {
    return {
      id: 'illustrated-handbook',
      major: {
        id: 'illustrated-handbook',
        name: '图鉴',
        icon: 'book-open',
        description: '图鉴条目与分类',
        order: 30
      },
      routeName: 'library-illustrated-handbook',
      buildSectionTree() {
        const store = useIllustratedHandbookStore()
        return sectionTreeForMajor('illustrated-handbook', {
          handbookCategories: handbookCatalogFromCategories(store.categories),
          linkSourceRoots: []
        })
      },
      async ensureLoaded() {
        await useIllustratedHandbookStore().loadCategories()
      },
      watchCatalogRefresh(onRefresh) {
        const store = useIllustratedHandbookStore()
        return watch(() => store.categories, () => onRefresh(), { deep: true })
      }
    }
  },

  resolveLegacyLibraryPath(cat, sub): RouteLocationRaw | null {
    if (cat !== 'illustrated-handbook') return null
    return {
      name: HANDBOOK_HOME_ROUTE,
      params: {
        catId: sub,
        subId: undefined
      }
    }
  },

  resolveFallbackLegacyLibraryPath(cat, sub): RouteLocationRaw | null {
    if (isLibraryMajorId(cat)) return null
    return {
      name: HANDBOOK_HOME_ROUTE,
      params: { catId: cat, subId: sub }
    }
  },

  registerQuickAccess(register) {
    register({
      kind: 'library',
      paletteMeta: { label: '图鉴', icon: 'book-open', order: 10 },
      async open(target, ctx) {
        const id = target.itemId ?? target.id
        if (!id) return false
        const router = (await import('@app/router')).default
        const { useItemDetailNavigation } = await import('@app/composables/useItemDetailNavigation')
        const handbookPath = router.resolve({ name: HANDBOOK_HOME_ROUTE }).fullPath
        const route = router.currentRoute.value
        if (!isItemDetailRoute(route.name)) {
          if (route.name !== HANDBOOK_HOME_ROUTE) {
            await ctx.pushRoute({ name: HANDBOOK_HOME_ROUTE })
            await ctx.afterRouteReady()
          }
        }
        const { openItemDetail } = useItemDetailNavigation()
        await openItemDetail({ source: 'library', id }, handbookPath)
      }
    })
    register({
      kind: 'favorite',
      order: 10,
      async open(target, ctx) {
        const source = target.itemSource ?? 'library'
        if (source !== 'library') return false
        const id = target.itemId ?? target.id
        if (!id) return false
        const router = (await import('@app/router')).default
        const { useItemDetailNavigation } = await import('@app/composables/useItemDetailNavigation')
        const handbookPath = router.resolve({ name: HANDBOOK_HOME_ROUTE }).fullPath
        const route = router.currentRoute.value
        if (!isItemDetailRoute(route.name)) {
          if (route.name !== HANDBOOK_HOME_ROUTE) {
            await ctx.pushRoute({ name: HANDBOOK_HOME_ROUTE })
            await ctx.afterRouteReady()
          }
        }
        const { openItemDetail } = useItemDetailNavigation()
        await openItemDetail({ source: 'library', id }, handbookPath)
      }
    })
  }
}
