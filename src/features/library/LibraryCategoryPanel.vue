<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { TreeNode } from 'primevue/treenode'
import IconField from 'primevue/iconfield'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import InputText from 'primevue/inputtext'
import WwCatalogTree from '@shared/components/WwCatalogTree.vue'
import { isLibraryMajorId, type LibraryMajorId } from '@library/config/majors'
import {
  composeLibraryTree,
  handbookCatalogFromCategories,
  sectionTreeForMajor
} from '@features/library/libraryCategoryTree'
import { useIllustratedHandbookStore } from '@shared/stores/illustratedHandbook'
import { useLinksStore } from '@shared/stores/links'
import { filterLinksSourceTreeNodes } from '@features/library/links/linksSearch'
import { filterTreeNodes } from '@library/catalog/filterTreeNodes'

const EXPANDED_STORAGE_KEY = 'wanwu:library:category-tree-expanded'

const route = useRoute()
const router = useRouter()
const handbookStore = useIllustratedHandbookStore()
const linksStore = useLinksStore()

const selectionKeys = ref<Record<string, boolean>>({})
const categorySearch = ref('')

const activeMajor = computed<LibraryMajorId | null>(() => {
  const m = route.meta.major as string | undefined
  if (m && isLibraryMajorId(m)) return m
  return null
})

const handbookCatalog = computed(() => handbookCatalogFromCategories(handbookStore.categories))

const sectionTree = computed(() => {
  const major = activeMajor.value
  if (!major) return []
  return sectionTreeForMajor(major, {
    handbookCategories: handbookCatalog.value,
    linkSourceRoots: linksStore.folders
  })
})

const sectionTreeFiltered = computed(() => {
  let tree = sectionTree.value
  if (activeMajor.value === 'links' && linksStore.isGlobalSearch) {
    tree = filterLinksSourceTreeNodes(
      tree,
      linksStore.folders,
      linksStore.globalSearchMatches
    )
  }
  return tree
})

const libraryTree = computed(() => {
  let tree = composeLibraryTree(activeMajor.value, sectionTreeFiltered.value)
  if (categorySearch.value.trim()) {
    tree = filterTreeNodes(tree, categorySearch.value)
  }
  return tree
})

const expandAllLibraryBranches = computed(
  () =>
    activeMajor.value === 'links' &&
    (linksStore.isGlobalSearch || !!categorySearch.value.trim())
)

function syncSelectionFromRoute() {
  const major = activeMajor.value
  if (!major) {
    selectionKeys.value = {}
    return
  }

  if (major === 'links') {
    const folderId = route.params.folderId as string | undefined
    selectionKeys.value = folderId ? { [`ln:${folderId}`]: true } : { 'major:links': true }
    return
  }

  selectionKeys.value = { [`major:${major}`]: true }

  if (major === 'illustrated-handbook') {
    const catId = route.params.catId as string | undefined
    const subId = route.params.subId as string | undefined
    if (!catId) return
    selectionKeys.value = subId
      ? { [`hb:${catId}::${subId}`]: true }
      : { [`hb:${catId}`]: true }
  }
}

async function loadForMajor(major: LibraryMajorId) {
  if (major === 'illustrated-handbook') {
    await handbookStore.loadCategories()
  } else if (major === 'links') {
    await linksStore.loadFolders()
  }
}

onMounted(async () => {
  if (activeMajor.value) await loadForMajor(activeMajor.value)
  syncSelectionFromRoute()
})

watch(
  () => activeMajor.value,
  async (major) => {
    if (major) await loadForMajor(major)
    syncSelectionFromRoute()
  }
)

watch(
  () => [route.meta.major, route.params.catId, route.params.subId, route.params.folderId],
  () => syncSelectionFromRoute()
)

function navigateMajor(majorId: LibraryMajorId) {
  if (majorId === 'illustrated-handbook') {
    void router.push({ name: 'library-illustrated-handbook' })
    return
  }
  void router.push({ name: 'library-links' })
}

function onNodeSelect(node: TreeNode) {
  const key = String(node.key)

  if (key.startsWith('major:')) {
    navigateMajor(key.slice('major:'.length) as LibraryMajorId)
    return
  }

  if (key.startsWith('hb:')) {
    const rest = key.slice(3)
    if (rest.includes('::')) {
      const [catId, subId] = rest.split('::')
      void router.push({ name: 'library-illustrated-handbook', params: { catId, subId } })
    } else {
      void router.push({ name: 'library-illustrated-handbook', params: { catId: rest } })
    }
    return
  }

  if (key.startsWith('ln:')) {
    const folderId = key.slice(3)
    void router.push({ name: 'library-links', params: { folderId } })
  }
}
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="shrink-0 px-2 pb-2">
      <IconField class="ww-field-search w-full">
        <WwInputIcon name="search" />
        <InputText
          v-model="categorySearch"
          placeholder="搜索目录…"
          class="w-full"
          aria-label="搜索全库目录"
        />
      </IconField>
    </div>
    <div class="ww-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
      <WwCatalogTree
        :nodes="libraryTree"
        :expanded-storage-key="EXPANDED_STORAGE_KEY"
        v-model:selection-keys="selectionKeys"
        :search-query="categorySearch"
        :expand-all-branches="expandAllLibraryBranches"
        major-key-prefix="major:"
        tree-class="ww-catalog-tree--library-majors"
        @select="onNodeSelect"
      />
    </div>
  </div>
</template>

<style>
.ww-field-search {
  width: 100%;
}

.ww-field-search .p-inputtext {
  width: 100%;
  font-size: 0.8125rem;
  padding: 0.4375rem 0.625rem 0.4375rem 1.75rem;
}

.ww-field-search .p-iconfield .p-inputicon {
  inset-block: 0;
  display: flex;
  align-items: center;
  width: 1.75rem;
  font-size: 0.8125rem;
  color: var(--ww-ink-faint);
}
</style>
