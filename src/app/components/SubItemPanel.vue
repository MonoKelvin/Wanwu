<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Tree from 'primevue/tree'
import type { TreeNode } from 'primevue/treenode'
import { useLibraryStore } from '@shared/stores/library'
import { useCustomStore } from '@shared/stores/custom'
import RssSidebar from '@features/rss/RssSidebar.vue'

const route = useRoute()
const router = useRouter()
const libraryStore = useLibraryStore()
const customStore = useCustomStore()

const module = computed(() => route.meta.module as string)
const expandedKeys = ref<Record<string, boolean>>({})
const selectionKeys = ref<Record<string, boolean>>({})

const libraryTree = computed<TreeNode[]>(() =>
  libraryStore.categories.map((cat) => ({
    key: cat.id,
    label: cat.name,
    icon: cat.icon ?? 'pi pi-folder',
    children:
      cat.children && cat.children.length > 0
        ? cat.children.map((sub) => ({
            key: `${cat.id}::${sub.id}`,
            label: sub.name,
            icon: 'pi pi-circle-fill',
            leaf: true
          }))
        : undefined
  }))
)

function syncLibrarySelection() {
  const catId = route.params.catId as string | undefined
  const subId = route.params.subId as string | undefined
  if (!catId) {
    selectionKeys.value = {}
    return
  }
  // 保留已展开的分类，支持同时展开多个
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
  } else if (module.value === 'custom') {
    await customStore.loadCategories()
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

watch(
  () => route.params.catId,
  async (catId) => {
    if (module.value !== 'custom' || typeof catId !== 'string') return
    await customStore.loadItems(catId)
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

function selectCustomCategory(catId: string) {
  router.push({ name: 'custom', params: { catId } })
}
</script>

<template>
  <aside class="ww-rss-panel flex w-[var(--ww-subpanel-width)] flex-col overflow-hidden" aria-label="分类">
    <header class="px-3 pb-2 pt-3">
      <h2 class="ww-section-label">{{ route.meta.title }}</h2>
    </header>

    <div v-if="module === 'library'" class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
      <Tree
        v-model:expanded-keys="expandedKeys"
        v-model:selection-keys="selectionKeys"
        :value="libraryTree"
        selection-mode="single"
        class="ww-library-tree w-full border-0 bg-transparent p-0"
        @node-select="onLibrarySelect"
      />
    </div>

    <RssSidebar v-else-if="module === 'rss'" class="min-h-0 flex-1" />

    <nav v-else-if="module === 'custom'" class="min-h-0 flex-1 overflow-y-auto px-1.5 pb-3">
      <button
        v-for="cat in customStore.categories"
        :key="cat.id"
        type="button"
        class="ww-nav-item"
        :class="{ 'is-active': route.params.catId === cat.id }"
        @click="selectCustomCategory(cat.id)"
      >
        <i class="pi pi-folder" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate">{{ cat.name }}</span>
      </button>
      <p v-if="customStore.categories.length === 0" class="px-2 py-8 text-center text-xs text-ww-ink-muted">
        无分类
      </p>
    </nav>
  </aside>
</template>
