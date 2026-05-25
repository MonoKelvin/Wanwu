<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import IconField from 'primevue/iconfield'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import InputText from 'primevue/inputtext'
import WwIcon from '@shared/components/WwIcon.vue'
import { LIBRARY_MAJORS, isLibraryMajorId, type LibraryMajorId } from '@library/config/majors'
import { catalogToTreeNodes, type CatalogNode } from '@library/types/catalog'
import { useIllustratedHandbookStore } from '@shared/stores/illustratedHandbook'
import { useLinksStore } from '@shared/stores/links'

const route = useRoute()
const router = useRouter()
const handbookStore = useIllustratedHandbookStore()
const linksStore = useLinksStore()

const expandedKeys = ref<Record<string, boolean>>({})
const selectionKeys = ref<Record<string, boolean>>({})
const categorySearch = ref('')

const activeMajor = computed<LibraryMajorId | null>(() => {
  const m = route.meta.major as string | undefined
  if (m && isLibraryMajorId(m)) return m
  const seg = route.params.major as string | undefined
  if (seg && isLibraryMajorId(seg)) return seg
  return null
})

const majorNodes = computed<TreeNode[]>(() =>
  LIBRARY_MAJORS.map((m) => ({
    key: `major:${m.id}`,
    label: m.name,
    icon: m.icon,
    selectable: true,
    children: undefined,
    data: { kind: 'major', majorId: m.id }
  }))
)

const handbookCatalogNodes = computed<CatalogNode[]>(() =>
  handbookStore.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    icon: cat.icon,
    children: cat.children?.map((sub) => ({
      id: sub.id,
      name: sub.name,
      parentId: cat.id,
      leaf: true
    }))
  }))
)

const linksCatalogNodes = computed<CatalogNode[]>(() => linksStore.folderTree)

const sectionTree = computed<TreeNode[]>(() => {
  const major = activeMajor.value
  if (!major) return []

  if (major === 'illustrated-handbook') {
    return catalogToTreeNodes(handbookCatalogNodes.value, (node, parentKey) => {
      if (parentKey) {
        const parentId = parentKey.replace(/^hb:/, '').split('::')[0]
        return `hb:${parentId}::${node.id}`
      }
      return `hb:${node.id}`
    })
  }

  if (major === 'links') {
    return catalogToTreeNodes(linksCatalogNodes.value, (node) => `ln:${node.id}`)
  }

  return []
})

const libraryTree = computed<TreeNode[]>(() => {
  const major = activeMajor.value
  if (!major) {
    return majorNodes.value.map((n) => ({
      ...n,
      children: undefined
    }))
  }

  return majorNodes.value.map((n) => {
    const majorId = (n.data as { majorId: LibraryMajorId }).majorId
    if (majorId !== major) return { ...n, children: undefined }
    return {
      ...n,
      children: sectionTree.value.length ? sectionTree.value : undefined
    }
  })
})

function filterTree(nodes: TreeNode[], q: string): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of nodes) {
    const label = String(node.label ?? '').toLowerCase()
    const selfMatch = label.includes(q)
    const filteredChildren = node.children?.length ? filterTree(node.children, q) : undefined
    if (selfMatch) {
      result.push(node)
    } else if (filteredChildren?.length) {
      result.push({ ...node, children: filteredChildren })
    }
  }
  return result
}

const filteredLibraryTree = computed<TreeNode[]>(() => {
  const q = categorySearch.value.trim().toLowerCase()
  if (!q) return libraryTree.value
  return filterTree(libraryTree.value, q)
})

function syncSelectionFromRoute() {
  const major = activeMajor.value
  if (!major) {
    selectionKeys.value = {}
    return
  }

  selectionKeys.value = { [`major:${major}`]: true }

  if (major === 'illustrated-handbook') {
    const catId = route.params.catId as string | undefined
    const subId = route.params.subId as string | undefined
    if (!catId) return
    if (subId) {
      selectionKeys.value = { [`hb:${catId}::${subId}`]: true }
    } else {
      selectionKeys.value = { [`hb:${catId}`]: true }
    }
    return
  }

  if (major === 'links') {
    const folderId = route.params.folderId as string | undefined
    if (folderId) {
      selectionKeys.value = { [`ln:${folderId}`]: true }
    }
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
  () => [
    route.meta.major,
    route.params.catId,
    route.params.subId,
    route.params.folderId
  ],
  () => syncSelectionFromRoute()
)

function navigateMajor(majorId: LibraryMajorId) {
  expandedKeys.value = { [`major:${majorId}`]: true }
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
      <Tree
        v-model:expanded-keys="expandedKeys"
        v-model:selection-keys="selectionKeys"
        :value="filteredLibraryTree"
        selection-mode="single"
        class="ww-library-tree ww-library-tree--majors w-full border-0 bg-transparent p-0"
        @node-select="onNodeSelect"
      >
        <template #default="{ node }">
          <span class="ww-library-tree__row inline-flex items-center gap-2">
            <WwIcon
              v-if="String(node.key).startsWith('major:')"
              :name="(node.icon as string) || 'folder'"
              size="sm"
              class="ww-library-tree__major-icon shrink-0"
            />
            <span
              :class="{
                'ww-library-tree__major-label font-semibold': String(node.key).startsWith('major:')
              }"
            >
              {{ node.label }}
            </span>
          </span>
        </template>
      </Tree>
      <p
        v-if="categorySearch && filteredLibraryTree.length === 0"
        class="px-2 py-6 text-center text-xs text-ww-ink-muted"
      >
        无匹配目录
      </p>
    </div>
  </div>
</template>
