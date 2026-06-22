import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import { watch } from 'vue'
import type { IAppModule } from '@app/modules/types'
import { ROUTE_OUTLET_SHELL } from '@app/router/outletPlaceholder'
import { readQuickAccessPayload } from '@shared/types/quickAccess'
import {
  isPixelEditorRoute,
  LIBRARY_PIXEL_ART_EDITOR_ROUTE
} from '@modules/library/pixel-art/domain/meta'
import { buildPixelCatalogTree, pixelCatalogHooks } from '@modules/library/pixel-art/lib/pixelCatalogTree'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'

export const pixelArtAppModule: IAppModule = {
  id: 'wanwu.library.pixel-art',

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/pixel-art/edit/:fileId',
        name: LIBRARY_PIXEL_ART_EDITOR_ROUTE,
        component: ROUTE_OUTLET_SHELL,
        meta: {
          module: 'library',
          major: 'pixel-art',
          title: '僝素画编辑器',
          hideSubPanel: true
        }
      },
      {
        path: '/library/pixel-art/edit/:fileId',
        redirect: (to) => ({
          name: LIBRARY_PIXEL_ART_EDITOR_ROUTE,
          params: { fileId: to.params.fileId as string },
          query: to.query
        })
      }
    ]
  },

  getLibraryChildRoutes(): RouteRecordRaw[] {
    return [
      {
        path: 'pixel-art',
        name: 'library-pixel-art-home',
        component: () => import('@modules/library/pixel-art/views/PixelHomeView.vue'),
        meta: { module: 'library', major: 'pixel-art', title: '僝素画' }
      },
      {
        path: 'pixel-art/f/:folderId',
        name: 'library-pixel-art-folder',
        component: () => import('@modules/library/pixel-art/views/PixelFileListView.vue'),
        meta: { module: 'library', major: 'pixel-art', title: '僝素画' }
      }
    ]
  },

  getLibrarySubmodule() {
    return {
      id: 'pixel-art',
      major: {
        id: 'pixel-art',
        name: '僝素画',
        icon: 'layout-grid',
        description: '僝素图创作与整睆',
        order: 25
      },
      routeName: 'library-pixel-art-home',
      catalog: pixelCatalogHooks,
      buildSectionTree() {
        return buildPixelCatalogTree(usePixelArtStore().folders)
      },
      async ensureLoaded() {
        const store = usePixelArtStore()
        await store.loadFolders()
        await store.refreshRecycleCount()
      },
      watchCatalogRefresh(onRefresh) {
        const store = usePixelArtStore()
        return watch(
          () =>
            store.folders
              .map((f) => `${f.id}:${f.name}:${f.sortOrder}:${f.deletedAt ?? ''}`)
              .join('|'),
          () => onRefresh()
        )
      }
    }
  },

  resolveLegacyLibraryPath(cat, sub): RouteLocationRaw | null {
    if (cat !== 'pixel-art') return null
    if (!sub) return { name: 'library-pixel-art-home' }
    return { name: 'library-pixel-art-folder', params: { folderId: sub } }
  },

  belongsToLibraryPath(path) {
    return path.startsWith('/pixel-art')
  },

  registerQuickAccess(register) {
    register({
      kind: 'pixel-art',
      paletteMeta: { label: '僝素画', icon: 'layout-grid', order: 28 },
      async open(target, ctx) {
        const payload = readQuickAccessPayload(target)
        const fileId =
          (typeof payload.fileId === 'string' ? payload.fileId : undefined) ?? target.id
        if (!fileId) return false
        await ctx.pushRoute({
          name: LIBRARY_PIXEL_ART_EDITOR_ROUTE,
          params: { fileId }
        })
      }
    })
  },

  registerShellOutlet(register) {
    register({
      id: 'wanwu.pixel-art.editor',
      priority: 25,
      matchesRoute: (route) => isPixelEditorRoute(route.name, route.path),
      loadComponent: () =>
        import('@modules/library/pixel-art/views/PixelEditorView.vue').then((m) => m.default),
      keepAliveInclude: 'PixelEditorView',
      getActiveShellKey: (route) => `pixel-art-editor:${String(route.params.fileId ?? 'new')}`
    })
  }
}
