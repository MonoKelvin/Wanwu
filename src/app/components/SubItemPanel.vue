<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import IconField from 'primevue/iconfield'
import WwInputIcon from '@shared/components/WwInputIcon.vue'
import InputText from 'primevue/inputtext'
import { useLibraryStore } from '@shared/stores/library'
import RssSidebar from '@features/rss/RssSidebar.vue'

const route = useRoute()
const router = useRouter()
const libraryStore = useLibraryStore()

const module = computed(() => route.meta.module as string)
const expandedKeys = ref<Record<string, boolean>>({})
const selectionKeys = ref<Record<string, boolean>>({})
const categorySearch = ref('')

const libraryTree = computed<TreeNode[]>(() =>
  libraryStore.categories.map((cat) => ({
    key: cat.id,
    label: cat.name,
    children:
      cat.children && cat.children.length > 0
        ? cat.children.map((sub) => ({
            key: `${cat.id}::${sub.id}`,
            label: sub.name,
            leaf: true
          }))
        : undefined
  }))
)

const filteredLibraryTree = computed<TreeNode[]>(() => {
  const q = categorySearch.value.trim().toLowerCase()
  if (!q) return libraryTree.value

  const result: TreeNode[] = []
  for (const node of libraryTree.value) {
    const label = String(node.label ?? '').toLowerCase()
    const catMatch = label.includes(q)
    const children = node.children?.filter((child) =>
      String(child.label ?? '')
        .toLowerCase()
        .includes(q)
    )
    if (catMatch) {
      result.push(node)
    } else if (children?.length) {
      result.push({ ...node, children })
    }
  }
  return result
})

function syncLibrarySelection() {
  const catId = route.params.catId as string | undefined
  const subId = route.params.subId as string | undefined
  if (!catId) {
    selectionKeys.value = {}
    return
  }
  expandedKeys.value = { ...expandedKeys.value, [catId]: true }
  if (subId) {
    selectionKeys.value = { [`${catId}::${subId}`]: true }
  } else {
    selectionKeys.value = { [catId]: true }
  }
}

async function loadModuleData() {
  if (module.value === 'library') {
    await libraryStore.loadCategories()
    syncLibrarySelection()
  }
}

onMounted(loadModuleData)
watch(() => route.meta.module, loadModuleData)

watch(
  () => [route.params.catId, route.params.subId],
  async ([catId, subId]) => {
    if (module.value !== 'library' || typeof catId !== 'string') return
    libraryStore.selectedCategoryId = catId
    syncLibrarySelection()
    await libraryStore.loadItems(catId, subId as string | undefined)
  },
  { immediate: true }
)

function onLibrarySelect(node: TreeNode) {
  const key = String(node.key)
  if (key.includes('::')) {
    const [catId, subId] = key.split('::')
    router.push({ name: 'library', params: { catId, subId } })
  } else {
    router.push({ name: 'library', params: { catId: key } })
  }
}
</script>

<template>
  <aside class="ww-rss-panel flex w-[var(--ww-subpanel-width)] flex-col overflow-hidden" aria-label="分类">
    <header class="ww-chrome-safe px-3 pb-2">
      <h2 class="ww-section-label">{{ route.meta.title }}</h2>
    </header>

    <div v-show="module === 'library'" class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="shrink-0 px-2 pb-2">
        <IconField class="ww-field-search w-full">
          <WwInputIcon name="search" />
          <InputText
            v-model="categorySearch"
            placeholder="搜索分类…"
            class="w-full"
            aria-label="搜索全库分类"
          />
        </IconField>
      </div>
      <div class="ww-scrollbar min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
        <Tree
          v-model:expanded-keys="expandedKeys"
          v-model:selection-keys="selectionKeys"
          :value="filteredLibraryTree"
          selection-mode="single"
          class="ww-library-tree w-full border-0 bg-transparent p-0"
          @node-select="onLibrarySelect"
        />
        <p
          v-if="categorySearch && filteredLibraryTree.length === 0"
          class="px-2 py-6 text-center text-xs text-ww-ink-muted"
        >
          无匹配分类
        </p>
      </div>
    </div>

    <div v-show="module === 'rss'" class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <RssSidebar class="min-h-0 flex-1" />
    </div>
  </aside>
</template>
