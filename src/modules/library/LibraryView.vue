<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import { useLibraryStore } from '@shared/stores/library'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import ItemCard from '@features/item/ItemCard.vue'
import LibraryItemList from '@features/library/LibraryItemList.vue'
import LibraryHeaderToolbar from '@features/library/LibraryHeaderToolbar.vue'
import type { LibrarySortField, LibraryViewMode } from '@features/library/LibraryHeaderToolbar.vue'
import type { Item } from '@shared/types/item'

const VIEW_KEY = 'wanwu.library.viewMode'
const SORT_KEY = 'wanwu.library.sortField'

const route = useRoute()
const router = useRouter()
const store = useLibraryStore()

const listSearch = ref('')
const listSuggestions = ref<Item[]>([])

function readViewMode(): LibraryViewMode {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'card'
  } catch {
    return 'card'
  }
}

function readSortField(): LibrarySortField {
  try {
    const v = localStorage.getItem(SORT_KEY)
    if (v === 'createdAt' || v === 'name' || v === 'updatedAt') return v
  } catch {
    /* ignore */
  }
  return 'updatedAt'
}

const viewMode = ref<LibraryViewMode>(readViewMode())
const sortField = ref<LibrarySortField>(readSortField())

watch(viewMode, (mode) => {
  try {
    localStorage.setItem(VIEW_KEY, mode)
  } catch {
    /* ignore */
  }
})

watch(sortField, (field) => {
  try {
    localStorage.setItem(SORT_KEY, field)
  } catch {
    /* ignore */
  }
})

onMounted(async () => {
  await store.loadCategories()
  const catId = route.params.catId as string | undefined
  if (catId) {
    await store.loadItems(catId, route.params.subId as string | undefined)
  }
})

watch(
  () => [route.params.catId, route.params.subId],
  async ([catId, subId]) => {
    listSearch.value = ''
    listSuggestions.value = []
    if (typeof catId === 'string') {
      await store.loadItems(catId, subId as string | undefined)
    } else {
      store.items = []
    }
  }
)

function openItem(id: string) {
  router.push({ name: 'item-detail', params: { source: 'library', id } })
}

function itemMatchesQuery(item: Item, q: string) {
  if (item.name.toLowerCase().includes(q)) return true
  if (item.summary?.toLowerCase().includes(q)) return true
  return item.tags?.some((t) => t.toLowerCase().includes(q)) ?? false
}

function completeListSearch(event: { query: string }) {
  const q = event.query.trim().toLowerCase()
  if (!q) {
    listSuggestions.value = []
    return
  }
  listSuggestions.value = store.items.filter((item) => itemMatchesQuery(item, q)).slice(0, 12)
}

function onSelectListItem(item: Item) {
  listSearch.value = item.name
  openItem(item.id)
}

function compareItems(a: Item, b: Item): number {
  if (sortField.value === 'name') {
    return a.name.localeCompare(b.name, 'zh-CN', { sensitivity: 'base' })
  }
  const key = sortField.value === 'createdAt' ? 'createdAt' : 'updatedAt'
  const ta = Date.parse(a[key] ?? '') || 0
  const tb = Date.parse(b[key] ?? '') || 0
  return tb - ta
}

const headerSubtitle = computed(() => {
  const catId = route.params.catId as string | undefined
  if (!catId) return '选择左侧分类'
  const cat = store.categories.find((c) => c.id === catId)
  const subId = route.params.subId as string | undefined
  if (subId && cat?.children) {
    const sub = cat.children.find((s) => s.id === subId)
    return sub ? `${cat.name} · ${sub.name}` : cat?.name
  }
  return cat?.name
})

const filteredItems = computed(() => {
  const q = listSearch.value.trim().toLowerCase()
  if (!q) return store.items
  return store.items.filter((item) => itemMatchesQuery(item, q))
})

const displayedItems = computed(() => [...filteredItems.value].sort(compareItems))

const listCountLabel = computed(() => {
  const n = displayedItems.value.length
  const total = store.items.length
  if (!listSearch.value.trim()) return `${n} 条`
  return `${n} / ${total} 条`
})

const isCardView = computed(() => viewMode.value === 'card')
const hasCategory = computed(() => Boolean(route.params.catId))
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <PageHeader title="全库" :subtitle="headerSubtitle">
      <template v-if="hasCategory" #actions>
        <LibraryHeaderToolbar
          v-model:search="listSearch"
          v-model:view-mode="viewMode"
          v-model:sort-field="sortField"
          :suggestions="listSuggestions"
          @complete="completeListSearch"
          @select-item="onSelectListItem"
        />
      </template>
    </PageHeader>

    <EmptyState
      v-if="!hasCategory"
      variant="guide"
      code="—"
      title="尚未选择分类"
      description="在左侧展开分类树，浏览该类别下的物品。"
    />

    <div v-else-if="store.loading" class="ww-scroll-main">
      <div v-if="isCardView" class="grid grid-cols-12 gap-3">
        <div v-for="i in 8" :key="i" class="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
          <Skeleton height="11rem" class="mb-2 !rounded-xl !bg-ww-panel" />
          <Skeleton width="65%" height="0.875rem" class="!bg-ww-panel" />
        </div>
      </div>
      <div v-else class="flex flex-col gap-2">
        <Skeleton v-for="i in 8" :key="i" height="3.5rem" class="!rounded-lg !bg-ww-panel" />
      </div>
    </div>

    <EmptyState
      v-else-if="store.items.length === 0"
      code="EMPTY"
      title="这里还是空的"
      description="该分类下暂无条目。"
    />

    <EmptyState
      v-else-if="displayedItems.length === 0"
      class="ww-scroll-main"
      variant="not-found"
      code="404"
      title="无匹配结果"
      description="请调整关键词或清除搜索。"
    />

    <div v-else class="ww-scroll-main ww-library-grid-wrap min-h-0 flex-1">
      <p class="ww-library-list-meta">{{ listCountLabel }}</p>

      <div v-if="isCardView" class="ww-library-grid">
        <ItemCard
          v-for="item in displayedItems"
          :key="item.id"
          :item="item"
          @click="openItem(item.id)"
        />
      </div>
      <LibraryItemList v-else :items="displayedItems" @select="openItem" />
    </div>
  </div>
</template>
