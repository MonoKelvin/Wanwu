import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { ROUTE_OUTLET_SHELL } from '@app/router/outletPlaceholder'
import { diagramsCommandContributor } from '@modules/library/diagrams/app/command/DiagramCommandContributor'
import {
  isDiagramEditorRoute,
  LIBRARY_DIAGRAMS_EDITOR_ROUTE
} from '@modules/library/diagrams/domain/diagramRoutes'
import { buildDiagramCatalogTree } from '@modules/library/diagrams/lib/diagramCatalogTree'

export const diagramsAppModule: IAppModule = {
  id: 'wanwu.library.diagrams',
  commandContributor: diagramsCommandContributor,

  getRoutes(): RouteRecordRaw[] {
    return [
      {
        path: '/diagrams/edit/:fileId',
        name: LIBRARY_DIAGRAMS_EDITOR_ROUTE,
        component: ROUTE_OUTLET_SHELL,
        meta: {
          module: 'library',
          major: 'diagrams',
          title: '流程图编辑器',
          hideSubPanel: true
        }
      },
      {
        path: '/library/diagrams/edit/:fileId',
        redirect: (to) => ({
          name: LIBRARY_DIAGRAMS_EDITOR_ROUTE,
          params: { fileId: to.params.fileId as string },
          query: to.query
        })
      }
    ]
  },

  getLibraryChildRoutes(): RouteRecordRaw[] {
    return [
      {
        path: 'diagrams',
        name: 'library-diagrams-home',
        component: () => import('@modules/library/diagrams/views/DiagramHomeView.vue'),
        meta: { module: 'library', major: 'diagrams', title: '流程图' }
      },
      {
        path: 'diagrams/f/:folderId',
        name: 'library-diagrams-folder',
        component: () => import('@modules/library/diagrams/views/DiagramFileListView.vue'),
        meta: { module: 'library', major: 'diagrams', title: '流程图' }
      }
    ]
  },

  getLibrarySubmodule() {
    return {
      id: 'diagrams',
      routeName: 'library-diagrams-home',
      buildSectionTree(ctx) {
        return buildDiagramCatalogTree(ctx.diagramsStore.folders)
      },
      async ensureLoaded(ctx) {
        await ctx.diagramsStore.loadFolders()
        await ctx.diagramsStore.refreshRecycleCount()
      }
    }
  },

  resolveLegacyLibraryPath(cat, sub): RouteLocationRaw | null {
    if (cat !== 'diagrams') return null
    if (!sub) return { name: 'library-diagrams-home' }
    return { name: 'library-diagrams-folder', params: { folderId: sub } }
  },

  belongsToLibraryPath(path) {
    return path.startsWith('/diagrams')
  },

  registerQuickAccess(register) {
    register({
      kind: 'diagram',
      paletteMeta: { label: '流程图', icon: 'layers', order: 30 },
      async open(target, ctx) {
        const fileId = target.diagramFileId ?? target.id
        if (!fileId) return false
        await ctx.pushRoute({
          name: LIBRARY_DIAGRAMS_EDITOR_ROUTE,
          params: { fileId }
        })
      }
    })
  },

  registerShellOutlet(register) {
    register({
      id: 'wanwu.diagrams.editor',
      priority: 30,
      matchesRoute: (route) => isDiagramEditorRoute(route.name, route.path),
      loadComponent: () =>
        import('@modules/library/diagrams/views/DiagramEditorView.vue').then((m) => m.default),
      keepAliveInclude: 'DiagramEditorView',
      getActiveShellKey: (route) => `diagrams-editor:${String(route.params.fileId ?? 'new')}`
    })
  }
}
