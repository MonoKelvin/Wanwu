import { computed, reactive, watch, type Ref } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import { isLibraryMajorId, type LibraryMajorId } from '@modules/library/core/config/majors'
import { filterTreeNodes } from '@modules/library/core/catalog/filterTreeNodes'
import { composeLibraryTree } from '@modules/library/core/composables/libraryCategoryTree'
import {
  LIBRARY_SUBMODULES,
  libraryMajorIds,
  librarySubmoduleById,
  type LibrarySubmoduleContext
} from '@modules/library/core/registry/libraryModules'
import { filterLinksSourceTreeNodes } from '@modules/library/links/lib/linksSearch'
import type { useIllustratedHandbookStore } from '@shared/stores/illustratedHandbook'
import type { useLinksStore } from '@shared/stores/links'

type HandbookStore = ReturnType<typeof useIllustratedHandbookStore>
type LinksStore = ReturnType<typeof useLinksStore>

const MAJOR_IDS: LibraryMajorId[] = libraryMajorIds()

function emptyMajorState() {
  return {
    'illustrated-handbook': false,
    links: false
  } as Record<LibraryMajorId, boolean>
}

/** 全库侧栏：各大分类独立子树 + 异步加载章节数据 */
export function useLibraryCatalogTrees(options: {
  categorySearch: Ref<string>
  handbookStore: HandbookStore
  linksStore: LinksStore
}) {
  const sectionByMajor = reactive<Record<LibraryMajorId, TreeNode[]>>({
    'illustrated-handbook': [],
    links: []
  })
  const loadingMajor = reactive(emptyMajorState())
  const loadedMajor = reactive(emptyMajorState())

  const loadPromises = new Map<LibraryMajorId, Promise<void>>()
  const moduleContext: LibrarySubmoduleContext = {
    handbookStore: options.handbookStore,
    linksStore: options.linksStore
  }

  function buildSectionForMajor(major: LibraryMajorId): TreeNode[] {
    const mod = librarySubmoduleById(major)
    if (!mod) return []
    let tree = mod.buildSectionTree(moduleContext)
    if (major === 'links' && options.linksStore.isGlobalSearch) {
      tree = filterLinksSourceTreeNodes(
        tree,
        options.linksStore.folders,
        options.linksStore.globalSearchMatches
      )
    }
    return tree
  }

  function refreshSection(major: LibraryMajorId) {
    if (!loadedMajor[major]) return
    sectionByMajor[major] = buildSectionForMajor(major)
  }

  async function ensureMajorLoaded(major: LibraryMajorId): Promise<void> {
    if (!isLibraryMajorId(major)) return
    if (loadedMajor[major]) return
    const pending = loadPromises.get(major)
    if (pending) return pending

    const task = (async () => {
      loadingMajor[major] = true
      try {
        const mod = librarySubmoduleById(major)
        if (mod?.ensureLoaded) {
          await mod.ensureLoaded(moduleContext)
        }
        loadedMajor[major] = true
        refreshSection(major)
      } finally {
        loadingMajor[major] = false
        loadPromises.delete(major)
      }
    })()

    loadPromises.set(major, task)
    return task
  }

  function preloadAllMajors() {
    const run = () => {
      for (const major of MAJOR_IDS) {
        void ensureMajorLoaded(major)
      }
    }
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(run)
    } else {
      setTimeout(run, 0)
    }
  }

  function onCatalogNodeExpand(node: TreeNode) {
    const key = String(node.key)
    if (!key.startsWith('major:')) return
    const major = key.slice('major:'.length)
    if (isLibraryMajorId(major)) void ensureMajorLoaded(major)
  }

  const libraryTree = computed(() => {
    let tree = composeLibraryTree(
      {
        'illustrated-handbook': sectionByMajor['illustrated-handbook'],
        links: sectionByMajor.links
      },
      {
        majorLoading: {
          'illustrated-handbook': loadingMajor['illustrated-handbook'],
          links: loadingMajor.links
        },
        majorLoaded: loadedMajor
      }
    )
    const q = options.categorySearch.value.trim()
    if (q) tree = filterTreeNodes(tree, q)
    return tree
  })

  const expandAllBranches = computed(
    () =>
      options.linksStore.isGlobalSearch || !!options.categorySearch.value.trim()
  )

  watch(
    () => options.handbookStore.categories,
    () => refreshSection('illustrated-handbook'),
    { deep: true }
  )

  watch(
    () => options.linksStore.folders,
    () => refreshSection('links'),
    { deep: true }
  )

  watch(
    [() => options.linksStore.isGlobalSearch, () => options.linksStore.globalSearchMatches],
    () => refreshSection('links')
  )

  return {
    libraryTree,
    expandAllBranches,
    ensureMajorLoaded,
    preloadAllMajors,
    onCatalogNodeExpand,
    loadedMajor
  }
}
