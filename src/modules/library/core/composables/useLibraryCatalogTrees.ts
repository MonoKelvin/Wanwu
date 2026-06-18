import { computed, onScopeDispose, reactive, watch, type Ref } from 'vue'
import type { TreeNode } from 'primevue/treenode'
import { isLibraryMajorId, type LibraryMajorId } from '@modules/library/core/config/majors'
import { filterTreeNodes } from '@shared/lib/filterTreeNodes'
import { composeLibraryTree } from '@modules/library/core/composables/libraryCategoryTree'
import { libraryMajorIds, librarySubmoduleById } from '@modules/library/core/registry/libraryModules'

const MAJOR_IDS: LibraryMajorId[] = libraryMajorIds()

function emptyMajorState(): Record<LibraryMajorId, boolean> {
  return Object.fromEntries(MAJOR_IDS.map((id) => [id, false])) as Record<
    LibraryMajorId,
    boolean
  >
}

function emptyMajorTreeState(): Record<LibraryMajorId, TreeNode[]> {
  return Object.fromEntries(MAJOR_IDS.map((id) => [id, [] as TreeNode[]])) as Record<
    LibraryMajorId,
    TreeNode[]
  >
}

/** 全库侧栏：各大分类独立子树 + 异步加载章节数据（不依赖具体子模块 store 类型） */
export function useLibraryCatalogTrees(options: { categorySearch: Ref<string> }) {
  const sectionByMajor = reactive(emptyMajorTreeState())
  const loadingMajor = reactive(emptyMajorState())
  const loadedMajor = reactive(emptyMajorState())

  const loadPromises = new Map<LibraryMajorId, Promise<void>>()
  const refreshStops: Array<() => void> = []

  function buildSectionForMajor(major: LibraryMajorId): TreeNode[] {
    const mod = librarySubmoduleById(major)
    if (!mod) return []
    return mod.buildSectionTree()
  }

  function refreshSection(major: LibraryMajorId) {
    if (!loadedMajor[major]) return
    sectionByMajor[major] = buildSectionForMajor(major)
  }

  function bindCatalogRefreshWatchers() {
    for (const stop of refreshStops) stop()
    refreshStops.length = 0
    for (const major of MAJOR_IDS) {
      const mod = librarySubmoduleById(major)
      const stop = mod?.watchCatalogRefresh?.(() => refreshSection(major))
      if (typeof stop === 'function') refreshStops.push(stop)
    }
  }

  bindCatalogRefreshWatchers()

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
          await mod.ensureLoaded()
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
    const sectionTrees = Object.fromEntries(
      MAJOR_IDS.map((id) => [id, sectionByMajor[id]])
    ) as Record<LibraryMajorId, TreeNode[]>
    const majorLoading = Object.fromEntries(
      MAJOR_IDS.map((id) => [id, loadingMajor[id]])
    ) as Record<LibraryMajorId, boolean>
    let tree = composeLibraryTree(sectionTrees, {
      majorLoading,
      majorLoaded: loadedMajor
    })
    const q = options.categorySearch.value.trim()
    if (q) tree = filterTreeNodes(tree, q)
    return tree
  })

  const expandAllBranches = computed(() => {
    if (options.categorySearch.value.trim()) return true
    for (const major of MAJOR_IDS) {
      if (librarySubmoduleById(major)?.catalogExpandsAll?.()) return true
    }
    return false
  })

  watch(
    () => MAJOR_IDS.join(','),
    () => {
      bindCatalogRefreshWatchers()
    }
  )

  onScopeDispose(() => {
    for (const stop of refreshStops) stop()
  })

  return {
    libraryTree,
    expandAllBranches,
    ensureMajorLoaded,
    preloadAllMajors,
    onCatalogNodeExpand,
    loadedMajor
  }
}
