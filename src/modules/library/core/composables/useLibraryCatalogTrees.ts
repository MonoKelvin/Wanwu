import { computed, reactive, watch, type Ref } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import { isLibraryMajorId, type LibraryMajorId } from '@modules/library/core/config/majors'
import { filterTreeNodes } from '@shared/lib/filterTreeNodes'
import { composeLibraryTree } from '@modules/library/core/composables/libraryCategoryTree'
import {
  libraryMajorIds,
  librarySubmoduleById,
  type LibrarySubmoduleContext
} from '@modules/library/core/registry/libraryModules'
import { filterLinksSourceTreeNodes } from '@modules/library/links/lib/linksSearch'
import type { useIllustratedHandbookStore } from '@modules/library/illustrated-handbook/services/illustratedHandbookStore'
import type { useLinksStore } from '@modules/library/links/services/linksStore'
import type { useDiagramsStore } from '@modules/library/diagrams/services/diagramsStore'

type HandbookStore = ReturnType<typeof useIllustratedHandbookStore>
type LinksStore = ReturnType<typeof useLinksStore>
type DiagramsStore = ReturnType<typeof useDiagramsStore>

const MAJOR_IDS: LibraryMajorId[] = libraryMajorIds()

function emptyMajorState() {
  return {
    notes: false,
    'illustrated-handbook': false,
    links: false,
    diagrams: false
  } as Record<LibraryMajorId, boolean>
}

/** 全库侧栏：各大分类独立子树 + 异步加载章节数据 */
export function useLibraryCatalogTrees(options: {
  categorySearch: Ref<string>
  handbookStore: HandbookStore
  linksStore: LinksStore
  diagramsStore: DiagramsStore
}) {
  const sectionByMajor = reactive<Record<LibraryMajorId, TreeNode[]>>({
    notes: [],
    'illustrated-handbook': [],
    links: [],
    diagrams: []
  })
  const loadingMajor = reactive(emptyMajorState())
  const loadedMajor = reactive(emptyMajorState())

  const loadPromises = new Map<LibraryMajorId, Promise<void>>()
  const moduleContext: LibrarySubmoduleContext = {
    handbookStore: options.handbookStore,
    linksStore: options.linksStore,
    diagramsStore: options.diagramsStore
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
        notes: sectionByMajor.notes,
        'illustrated-handbook': sectionByMajor['illustrated-handbook'],
        links: sectionByMajor.links,
        diagrams: sectionByMajor.diagrams
      },
      {
        majorLoading: {
          notes: loadingMajor.notes,
          'illustrated-handbook': loadingMajor['illustrated-handbook'],
          links: loadingMajor.links,
          diagrams: loadingMajor.diagrams
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
    () =>
      options.diagramsStore.folders
        .map((f) => `${f.id}:${f.name}:${f.sortOrder}:${f.deletedAt ?? ''}`)
        .join('|'),
    () => refreshSection('diagrams')
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
