<script setup lang="ts">
defineOptions({ name: 'LeisureReadView' })

import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import LeisureReadTabs from '@modules/library/leisure-read/components/LeisureReadTabs.vue'
import LeisureReadCard from '@modules/library/leisure-read/components/LeisureReadCard.vue'
import FavoritesDrawer from '@modules/library/leisure-read/components/FavoritesDrawer.vue'
import { useLeisureReadStore } from '@modules/library/leisure-read/services/leisureReadStore'

const store = useLeisureReadStore()
const { activeTab, contentByTab, loadingTab, errorByTab, favoritesOpen, favorites } =
  storeToRefs(store)

const currentContent = computed(() => contentByTab.value[activeTab.value])
const isLoading = computed(() => loadingTab.value === activeTab.value)
const currentError = computed(() => errorByTab.value[activeTab.value])

onMounted(async () => {
  await store.loadFavorites()
  await store.fetchTab(activeTab.value)
})

watch(activeTab, (tab) => {
  void store.fetchTab(tab)
})

async function onCopy() {
  const content = currentContent.value
  if (!content) return
  await navigator.clipboard.writeText(store.copyText(content))
}

async function onToggleFavorite() {
  const content = currentContent.value
  if (!content) return
  await store.toggleFavorite(content)
}
</script>

<template>
  <div class="lr-view">
    <header class="lr-view__header">
      <h1 class="lr-view__title">闲读</h1>
      <LeisureReadTabs v-model="activeTab" />
    </header>
    <main class="lr-view__main">
      <LeisureReadCard
        :content="currentContent"
        :loading="isLoading"
        :error="currentError"
        :favorited="store.isFavorited(currentContent)"
        @next="store.next(activeTab)"
        @retry="store.fetchTab(activeTab, true)"
        @toggle-favorite="onToggleFavorite"
        @copy="onCopy"
        @open-favorites="favoritesOpen = true"
      />
    </main>
    <FavoritesDrawer
      :open="favoritesOpen"
      :favorites="favorites"
      @close="favoritesOpen = false"
      @remove="store.removeFavoriteById"
    />
  </div>
</template>

<style scoped>
.lr-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 1.25rem 1.5rem;
  gap: 1.25rem;
}

.lr-view__header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.lr-view__title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.lr-view__main {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: stretch;
}
</style>
