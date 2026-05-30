import type { TreeNode } from 'primevue/treenode'
import { LIBRARY_MAJORS, type LibraryMajorId } from '@modules/library/core/config/majors'
import { handbookCatalogFromCategories, sectionTreeForMajor } from '@modules/library/core/composables/libraryCategoryTree'
import type { useIllustratedHandbookStore } from '@shared/stores/illustratedHandbook'
import type { useLinksStore } from '@shared/stores/links'

type HandbookStore = ReturnType<typeof useIllustratedHandbookStore>
type LinksStore = ReturnType<typeof useLinksStore>

export interface LibrarySubmoduleContext {
  handbookStore: HandbookStore
  linksStore: LinksStore
}

export interface LibrarySubmoduleConfig {
  id: LibraryMajorId
  routeName: string
  buildSectionTree: (ctx: LibrarySubmoduleContext) => TreeNode[]
  ensureLoaded?: (ctx: LibrarySubmoduleContext) => Promise<void>
}

const illustratedHandbookModule: LibrarySubmoduleConfig = {
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

const notesModule: LibrarySubmoduleConfig = {
  id: 'notes',
  routeName: 'library-notes',
  buildSectionTree() {
    return []
  }
}

const linksModule: LibrarySubmoduleConfig = {
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

export const LIBRARY_SUBMODULES: LibrarySubmoduleConfig[] = [
  notesModule,
  linksModule,
  illustratedHandbookModule
]

export function librarySubmoduleById(id: LibraryMajorId): LibrarySubmoduleConfig | undefined {
  return LIBRARY_SUBMODULES.find((m) => m.id === id)
}

export function libraryMajorIds(): LibraryMajorId[] {
  return LIBRARY_MAJORS.map((m) => m.id)
}

