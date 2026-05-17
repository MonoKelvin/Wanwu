<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '@shared/stores/library'
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
    }
  }
)

function openItem(id: string) {
  router.push({ name: 'item-detail', params: { source: 'library', id } })
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header class="flex items-center justify-between border-b border-ww-border px-6 py-4">
      <div>
        <h1 class="text-lg font-medium">全库</h1>
        <p class="text-xs text-ww-muted">系统预置内容，可浏览、编辑与补充</p>
      </div>
    </header>

    <div v-if="!route.params.catId" class="flex flex-1 flex-col items-center justify-center gap-2 text-ww-muted">
      <i class="pi pi-arrow-left text-2xl" />
      <p class="text-sm">请从左侧选择分类</p>
    </div>

    <div v-else-if="store.loading" class="flex flex-1 items-center justify-center text-ww-muted">加载中…</div>

    <div
      v-else-if="store.items.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-2 text-ww-muted"
    >
      <p class="text-sm">该分类暂无物品</p>
      <p class="text-xs">可运行 npm run seed:import 导入示例数据</p>
    </div>

    <div
      v-else
      class="grid flex-1 grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 overflow-y-auto p-6"
    >
      <ItemCard v-for="item in store.items" :key="item.id" :item="item" @click="openItem(item.id)" />
    </div>
  </div>
</template>
