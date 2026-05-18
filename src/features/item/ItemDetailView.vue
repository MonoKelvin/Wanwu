<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import Skeleton from 'primevue/skeleton'
import EmptyState from '@app/components/EmptyState.vue'
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
  <div class="flex h-full flex-col overflow-hidden bg-ww-content">
    <header class="flex shrink-0 items-center gap-2 bg-ww-content px-4 py-2">
      <Button icon="pi pi-arrow-left" variant="text" rounded aria-label="返回" @click="goBack" />
      <span class="text-xs text-ww-ink-muted">详情</span>
      <Button
        v-if="item"
        icon="pi pi-heart"
        variant="text"
        size="small"
        class="ml-auto !text-ww-accent"
        aria-label="收藏"
        @click="toggleFavorite"
      />
    </header>

    <div v-if="loading" class="flex flex-1 flex-col gap-3 p-6">
      <Skeleton width="100%" height="12rem" class="!bg-ww-inset" />
      <Skeleton width="45%" height="1.5rem" class="!bg-ww-inset" />
    </div>

    <EmptyState v-else-if="!item" variant="not-found" code="404" title="未找到物品" description="该条目可能已被移除。" />

    <div v-else class="min-h-0 flex-1 overflow-y-auto bg-ww-inset">
      <article class="mx-auto max-w-[var(--ww-content-max)]">
        <section class="grid gap-6 bg-ww-content p-6 lg:grid-cols-2 lg:p-8">
          <div class="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-ww-panel">
            <img
              v-if="item.coverPath"
              :src="item.coverPath"
              :alt="item.name"
              class="h-full w-full object-cover"
            />
            <i v-else class="pi pi-image text-4xl text-ww-ink-faint opacity-25" />
          </div>
          <div class="flex flex-col justify-center gap-2.5">
            <h1 class="text-xl font-semibold tracking-tight text-ww-ink lg:text-2xl">{{ item.name }}</h1>
            <p v-if="item.summary" class="text-sm leading-relaxed text-ww-ink-muted">{{ item.summary }}</p>
            <div v-if="item.tags?.length" class="flex flex-wrap gap-1 pt-1">
              <Tag v-for="tag in item.tags" :key="tag" :value="tag" rounded severity="secondary" />
            </div>
            <Button
              icon="pi pi-heart"
              label="收藏"
              size="small"
              class="mt-2 self-start"
              @click="toggleFavorite"
            />
          </div>
        </section>

        <section v-if="item.description" class="bg-ww-content px-6 py-6 lg:px-8">
          <h2 class="ww-section-label mb-3">说明</h2>
          <div class="whitespace-pre-wrap text-sm leading-relaxed text-ww-ink">{{ item.description }}</div>
        </section>
      </article>
    </div>
  </div>
</template>
