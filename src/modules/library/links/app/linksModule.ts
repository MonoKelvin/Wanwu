import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import { watch } from 'vue'
import type { IAppModule } from '@app/modules/types'
import { sectionTreeForMajor } from '@modules/library/core/composables/libraryCategoryTree'
import { filterLinksSourceTreeNodes } from '@modules/library/links/lib/linksSearch'
import { useLinksStore } from '@modules/library/links/services/linksStore'

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
      major: {
        id: 'links',
        name: '链接',
        icon: 'link',
        description: '浏览器收藏与网址',
        order: 10
      },
      routeName: 'library-links',
      buildSectionTree() {
        const store = useLinksStore()
        let tree = sectionTreeForMajor('links', {
          handbookCategories: [],
          linkSourceRoots: store.folders
        })
        if (store.isGlobalSearch) {
          tree = filterLinksSourceTreeNodes(tree, store.folders, store.globalSearchMatches)
        }
        return tree
      },
      async ensureLoaded() {
        await useLinksStore().loadFolders()
      },
      watchCatalogRefresh(onRefresh) {
        const store = useLinksStore()
        return watch(
          [
            () => store.folders,
            () => store.isGlobalSearch,
            () => store.globalSearchMatches
          ],
          () => onRefresh(),
          { deep: true }
        )
      },
      catalogExpandsAll() {
        return useLinksStore().isGlobalSearch
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
