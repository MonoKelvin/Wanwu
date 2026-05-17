<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLibraryStore } from '@shared/stores/library'

const route = useRoute()
const router = useRouter()
const libraryStore = useLibraryStore()

const module = computed(() => route.meta.module as string)

onMounted(async () => {
  if (module.value === 'library') {
    await libraryStore.loadCategories()
  }
})

watch(
  () => route.params.catId,
  async (catId) => {
    if (module.value === 'library' && typeof catId === 'string') {
      libraryStore.selectedCategoryId = catId
      await libraryStore.loadItems(catId, route.params.subId as string | undefined)
    }
  },
  { immediate: true }
)

function selectCategory(catId: string) {
  router.push({ name: 'library', params: { catId } })
}

function selectSubCategory(catId: string, subId: string) {
  router.push({ name: 'library', params: { catId, subId } })
}
</script>

<template>
  <aside
    class="flex w-[var(--ww-subpanel-width)] flex-col overflow-hidden bg-ww-bg"
    aria-label="细项列表"
  >
    <header class="border-b border-ww-border px-4 py-3">
      <h2 class="text-sm font-medium">{{ route.meta.title }}</h2>
    </header>

    <div v-if="module === 'library'" class="flex-1 overflow-y-auto">
      <section v-for="cat in libraryStore.categories" :key="cat.id" class="border-b border-ww-border">
        <button
          type="button"
          class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-ww-bg-subtle"
          :class="route.params.catId === cat.id ? 'bg-ww-bg-subtle font-medium' : ''"
          @click="selectCategory(cat.id)"
        >
          <i v-if="cat.icon" :class="cat.icon" class="text-ww-muted" />
          {{ cat.name }}
        </button>
        <ul v-if="route.params.catId === cat.id && cat.children?.length" class="pb-2">
          <li v-for="sub in cat.children" :key="sub.id">
            <button
              type="button"
              class="w-full px-8 py-1.5 text-left text-xs text-ww-muted transition-colors hover:bg-ww-bg-subtle hover:text-ww-text"
              :class="route.params.subId === sub.id ? 'text-ww-text font-medium' : ''"
              @click="selectSubCategory(cat.id, sub.id)"
            >
              {{ sub.name }}
            </button>
          </li>
        </ul>
      </section>
    </div>

    <div v-else-if="module === 'rss'" class="flex-1 p-4 text-xs text-ww-muted">
      选择订阅源查看条目
    </div>

    <div v-else-if="module === 'custom'" class="flex-1 p-4 text-xs text-ww-muted">
      自建分类将显示于此
    </div>

    <div v-else class="flex-1 p-4 text-xs text-ww-muted">
      —
    </div>
  </aside>
</template>
