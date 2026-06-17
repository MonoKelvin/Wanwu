import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import {
  handbookCatalogFromCategories,
  sectionTreeForMajor
} from '@modules/library/core/composables/libraryCategoryTree'
import { isLibraryMajorId } from '@modules/library/core/config/majors'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

const HANDBOOK_HOME_ROUTE = 'library-illustrated-handbook'

export const handbookAppModule: IAppModule = {
  id: 'wanwu.library.illustrated-handbook',

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
      routeName: 'library-illustrated-handbook',
      buildSectionTree(ctx) {
        return sectionTreeForMajor('illustrated-handbook', {
          handbookCategories: handbookCatalogFromCategories(ctx.handbookStore.categories),
          linkSourceRoots: []
        })
      },
      async ensureLoaded(ctx) {
        await ctx.handbookStore.loadCategories()
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
