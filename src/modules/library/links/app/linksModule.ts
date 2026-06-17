import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { IAppModule } from '@app/modules/types'
import { sectionTreeForMajor } from '@modules/library/core/composables/libraryCategoryTree'

export const linksAppModule: IAppModule = {
  id: 'wanwu.library.links',

  getLibraryChildRoutes(): RouteRecordRaw[] {
    return [
      {
        path: 'links/:folderId?',
        name: 'library-links',
        component: () => import('@modules/library/links/views/LinksView.vue'),
        meta: { module: 'library', major: 'links', title: '链接' }
      }
    ]
  },

  getLibrarySubmodule() {
    return {
      id: 'links',
      routeName: 'library-links',
      buildSectionTree(ctx) {
        return sectionTreeForMajor('links', {
          handbookCategories: [],
          linkSourceRoots: ctx.linksStore.folders
        })
      },
      async ensureLoaded(ctx) {
        await ctx.linksStore.loadFolders()
      }
    }
  },

  resolveLegacyLibraryPath(cat, sub): RouteLocationRaw | null {
    if (cat !== 'links') return null
    return {
      name: 'library-links',
      params: { folderId: sub }
    }
  },

  registerQuickAccess(register) {
    register({
      kind: 'link',
      paletteMeta: { label: '链接', icon: 'link', order: 35 },
      async open(target) {
        if (!target.linkUrl) return false
        await window.wanwu.shell.openExternal(target.linkUrl)
      }
    })
  }
}
