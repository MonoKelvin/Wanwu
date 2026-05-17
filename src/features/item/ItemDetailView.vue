<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Item } from '@shared/types/item'

const route = useRoute()
const router = useRouter()
const item = ref<Item | null>(null)
const loading = ref(true)

onMounted(async () => {
  const id = route.params.id as string
  const source = route.params.source as string
  if (source === 'library') {
    item.value = await window.wanwu.library.getItem(id)
  }
  loading.value = false
})

function goBack() {
  router.back()
}

async function toggleFavorite() {
  if (!item.value) return
  await window.wanwu.user.toggleFavorite({ itemId: item.value.id, source: item.value.source })
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header class="flex items-center gap-4 border-b border-ww-border px-6 py-3">
      <button type="button" class="text-ww-muted hover:text-ww-text" @click="goBack">
        <i class="pi pi-arrow-left" />
      </button>
      <span class="text-sm text-ww-muted">物品详情</span>
      <button
        v-if="item"
        type="button"
        class="ml-auto border border-ww-border px-3 py-1 text-xs"
        @click="toggleFavorite"
      >
        收藏
      </button>
    </header>

    <div v-if="loading" class="flex flex-1 items-center justify-center text-ww-muted">加载中…</div>

    <div v-else-if="!item" class="flex flex-1 items-center justify-center text-ww-muted">未找到物品</div>

    <div v-else class="flex-1 overflow-y-auto">
      <!-- Hero -->
      <section class="relative border-b border-ww-border bg-ww-bg-subtle px-6 py-12">
        <div
          class="pointer-events-none absolute inset-0 opacity-40"
          style="backdrop-filter: blur(24px)"
        />
        <div class="relative max-w-3xl">
          <h1 class="text-2xl font-medium tracking-tight">{{ item.name }}</h1>
          <p v-if="item.summary" class="mt-3 text-ww-muted">{{ item.summary }}</p>
          <div v-if="item.tags?.length" class="mt-4 flex flex-wrap gap-2">
            <span
              v-for="tag in item.tags"
              :key="tag"
              class="border border-ww-border px-2 py-0.5 text-xs text-ww-muted"
            >
              {{ tag }}
            </span>
          </div>
        </div>
      </section>

      <!-- 详细说明 -->
      <section v-if="item.description" class="max-w-3xl px-6 py-8">
        <h2 class="mb-4 text-sm font-medium uppercase tracking-wider text-ww-muted">详细说明</h2>
        <div class="whitespace-pre-wrap text-sm leading-relaxed">{{ item.description }}</div>
      </section>
    </div>
  </div>
</template>
