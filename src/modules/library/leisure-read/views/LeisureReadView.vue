<script setup lang="ts">
defineOptions({ name: 'LeisureReadView' })

import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import PageHeader from '@app/components/PageHeader.vue'
import LeisureReadTabs from '@modules/library/leisure-read/components/LeisureReadTabs.vue'
import LeisureReadCard from '@modules/library/leisure-read/components/LeisureReadCard.vue'
import FavoritesDrawer from '@modules/library/leisure-read/components/FavoritesDrawer.vue'
import { useLeisureReadStore } from '@modules/library/leisure-read/services/leisureReadStore'
import type { ArticleSnippetPayload } from '@modules/library/leisure-read/components/ArticleBody.vue'
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'
import '@modules/library/leisure-read/styles/leisure-read.css'

const store = useLeisureReadStore()
const { activeTab, contentByTab, loadingTab, errorByTab, favoritesOpen, favorites } =
  storeToRefs(store)

const favFilterTab = ref<LeisureReadTabId>('quote')

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

async function onToggleFavorite() {
  const content = currentContent.value
  if (!content) return
  await store.toggleFavorite(content)
}

async function onFavoriteSnippet(payload: ArticleSnippetPayload) {
  const content = currentContent.value
  if (!content || content.tab !== 'article') return
  await store.addSnippetFavorite(content, payload)
}

async function onRemoveSnippet(payload: ArticleSnippetPayload) {
  const content = currentContent.value
  if (!content || content.tab !== 'article') return
  await store.removeSnippetHighlight(content, payload)
}
</script>

<template>
  <div class="lr-view">
    <PageHeader title="闲读" subtitle="一言 · 笑话 · 急转弯 · 美文" stacked-titles />
    <div class="lr-view__stage">
      <div class="lr-view__stack">
        <LeisureReadTabs v-model="activeTab" />
        <main class="lr-view__main">
          <LeisureReadCard
            :content="currentContent"
            :loading="isLoading"
            :error="currentError"
            :favorited="store.isFavorited(currentContent)"
            @next="store.next(activeTab)"
            @retry="store.fetchTab(activeTab, true)"
            @toggle-favorite="onToggleFavorite"
            @open-favorites="favoritesOpen = true"
            @favorite-snippet="onFavoriteSnippet"
            @remove-snippet="onRemoveSnippet"
          />
        </main>
      </div>
    </div>
    <FavoritesDrawer
      v-model:filter-tab="favFilterTab"
      :open="favoritesOpen"
      :favorites="favorites"
      :active-tab="activeTab"
      @close="favoritesOpen = false"
      @open="store.openFavorite"
      @remove="store.removeFavoriteById"
    />
  </div>
</template>
