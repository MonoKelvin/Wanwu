<script setup lang="ts">
defineOptions({ name: 'LibraryView' })

import { computed, nextTick, onActivated, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useItemDetailNavigation } from '@app/composables/useItemDetailNavigation'
import { useLibraryRouteContext } from '@features/library/useLibraryRouteContext'
import Skeleton from 'primevue/skeleton'
import { useLibraryStore } from '@shared/stores/library'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import ItemCard from '@features/item/ItemCard.vue'
import LibraryItemList from '@features/library/LibraryItemList.vue'
import LibraryHeaderToolbar from '@features/library/LibraryHeaderToolbar.vue'
import type { LibrarySortField, LibraryViewMode } from '@features/library/LibraryHeaderToolbar.vue'
import type { Item } from '@shared/types/item'
import { useLibraryListScroll } from '@features/library/useLibraryListScroll'
import { libraryCategoryKey } from '@features/library/useLibraryRouteContext'

const VIEW_KEY = 'wanwu.library.viewMode'
const SORT_KEY = 'wanwu.library.sortField'

const route = useRoute()
const store = useLibraryStore()
const routeCtx = useLibraryRouteContext()
const { openItemDetail } = useItemDetailNavigation()

const pageRoot = ref<HTMLElement | null>(null)
const { save: saveListScroll, restore: restoreListScroll } = useLibraryListScroll(pageRoot, routeCtx)

const listSearch = ref('')
const listSuggestions = ref<Item[]>([])

const catId = routeCtx.catId
const subId = routeCtx.subId

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
  if (catId.value) {
    playListStagger.value = true
    await store.loadItems(catId.value, subId.value)
  }
})

watch(
  [catId, subId, routeCtx.isLibraryRoute],
  async ([nextCat, nextSub, onLibrary], prev) => {
    if (!onLibrary) return
    const prevCat = prev?.[0]
    const prevSub = prev?.[1]
    const nextKey = routeCtx.categoryKey.value
    const prevKey = libraryCategoryKey(prevCat, prevSub)
    if (prevKey != null && nextKey != null && nextKey !== prevKey) {
      listSearch.value = ''
      listSuggestions.value = []
      playListStagger.value = true
    }
    if (typeof nextCat === 'string') {
      await store.loadItems(nextCat, nextSub as string | undefined)
    } else {
      store.items = []
      playListStagger.value = false
    }
  }
)

watch(
  () => route.name,
  (name, prev) => {
    if (prev === 'item-detail' && name !== 'item-detail') {
      saveListScroll()
    }
    if (prev === 'item-detail' && name === 'library') {
      playListStagger.value = false
      restoreListScroll()
    }
  }
)

onActivated(async () => {
  if (!routeCtx.isLibraryRoute.value) return
  playListStagger.value = false
  await nextTick()
  restoreListScroll()
})

function openItem(id: string) {
  saveListScroll()
  void openItemDetail({ source: 'library', id })
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
  const id = catId.value
  if (!id) return '选择左侧分类'
  const cat = store.categories.find((c) => c.id === id)
  const sub = subId.value
  if (sub && cat?.children) {
    const child = cat.children.find((s) => s.id === sub)
    return child ? `${cat.name} · ${child.name}` : cat?.name
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
const hasCategory = computed(() => Boolean(catId.value))
/** 仅切换分类首次展示列表时播放卡片入场，从详情返回不播 */
const playListStagger = ref(false)
</script>

<template>
  <div ref="pageRoot" class="flex h-full min-h-0 flex-col overflow-hidden">
    <ModulePageLayout>
      <template #header>
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
      </template>

      <EmptyState
        v-if="!hasCategory"
        variant="guide"
        code="—"
        title="尚未选择分类"
        description="在左侧展开分类树，浏览该类别下的物品。"
      />

      <div v-else-if="store.loading">
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
        variant="not-found"
        code="404"
        title="无匹配结果"
        description="请调整关键词或清除搜索。"
      />

      <div v-else class="ww-library-grid-wrap">
        <p class="ww-library-list-meta">{{ listCountLabel }}</p>

        <div
          v-if="isCardView"
          class="ww-library-grid"
          :class="{ 'ww-stagger-children': playListStagger }"
        >
          <ItemCard
            v-for="(item, index) in displayedItems"
            :key="item.id"
            :item="item"
            :stagger-index="index"
            @click="openItem(item.id)"
          />
        </div>
        <LibraryItemList v-else :items="displayedItems" @select="openItem" />
      </div>
    </ModulePageLayout>
  </div>
</template>
