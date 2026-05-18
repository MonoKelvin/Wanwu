<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Skeleton from 'primevue/skeleton'
import { useLibraryStore } from '@shared/stores/library'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import ItemCard from '@features/item/ItemCard.vue'

const route = useRoute()
const router = useRouter()
const store = useLibraryStore()

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
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <PageHeader title="全库" :subtitle="headerSubtitle" />

    <EmptyState
      v-if="!route.params.catId"
      variant="guide"
      code="—"
      title="尚未选择分类"
      description="在左侧展开分类树，浏览该类别下的物品。"
    />

    <div v-else-if="store.loading" class="ww-scroll-main">
      <div class="grid grid-cols-12 gap-3">
        <div v-for="i in 8" :key="i" class="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3">
          <Skeleton height="11rem" class="mb-2 !bg-ww-panel" />
          <Skeleton width="65%" height="0.875rem" class="!bg-ww-panel" />
        </div>
      </div>
    </div>

    <EmptyState
      v-else-if="store.items.length === 0"
      code="EMPTY"
      title="这里还是空的"
      description="当前分类下没有物品。可导入示例数据开始体验。"
    >
      <code>npm run seed:import</code>
    </EmptyState>

    <div v-else class="ww-scroll-main">
      <div class="grid grid-cols-12 gap-3">
        <div
          v-for="item in store.items"
          :key="item.id"
          class="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-3"
        >
          <ItemCard :item="item" @click="openItem(item.id)" />
        </div>
      </div>
    </div>
  </div>
</template>
