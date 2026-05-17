<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Button from 'primevue/button'

interface Feed {
  id: string
  title: string
  url: string
  enabled: boolean
  isDefault: boolean
  lastFetchedAt: string | null
}

interface Entry {
  id: string
  title: string
  summary: string
  link: string
  publishedAt: string
}

const feeds = ref<Feed[]>([])
const entries = ref<Entry[]>([])
const selectedFeedId = ref<string | null>(null)
const loading = ref(false)
const error = ref('')

onMounted(async () => {
  feeds.value = await window.wanwu.rss.listFeeds()
  if (feeds.value.length) {
    selectedFeedId.value = feeds.value[0].id
    await loadEntries()
  }
})

async function loadEntries() {
  if (!selectedFeedId.value) return
  entries.value = await window.wanwu.rss.listEntries(selectedFeedId.value)
}

async function refresh() {
  if (!selectedFeedId.value) return
  loading.value = true
  error.value = ''
  const result = await window.wanwu.rss.fetchFeed(selectedFeedId.value)
  loading.value = false
  if (!result.ok) {
    error.value = result.error ?? '刷新失败'
    return
  }
  await loadEntries()
}

function selectFeed(id: string) {
  selectedFeedId.value = id
  loadEntries()
}
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <header class="flex items-center justify-between border-b border-ww-border px-6 py-4">
      <div>
        <h1 class="text-lg font-medium">RSS</h1>
        <p class="text-xs text-ww-muted">订阅与浏览资讯流</p>
      </div>
      <Button label="刷新" :loading="loading" size="small" @click="refresh" />
    </header>

    <p v-if="error" class="border-b border-ww-border bg-ww-bg-subtle px-6 py-2 text-xs text-red-600">
      {{ error }}
    </p>

    <div class="flex flex-1 overflow-hidden">
      <ul class="w-56 shrink-0 overflow-y-auto border-r border-ww-border">
        <li v-for="feed in feeds" :key="feed.id">
          <button
            type="button"
            class="w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-ww-bg-subtle"
            :class="selectedFeedId === feed.id ? 'bg-ww-bg-subtle font-medium' : ''"
            @click="selectFeed(feed.id)"
          >
            {{ feed.title }}
            <span v-if="feed.isDefault" class="ml-1 text-xs text-ww-muted">默认</span>
          </button>
        </li>
      </ul>

      <ul class="flex-1 overflow-y-auto p-4">
        <li
          v-for="entry in entries"
          :key="entry.id"
          class="border-b border-ww-border py-4 last:border-0"
        >
          <a
            :href="entry.link"
            class="text-sm font-medium hover:underline"
            target="_blank"
            rel="noopener"
          >
            {{ entry.title }}
          </a>
          <p v-if="entry.summary" class="mt-1 line-clamp-2 text-xs text-ww-muted">{{ entry.summary }}</p>
          <time class="mt-1 block text-xs text-ww-muted">{{ entry.publishedAt }}</time>
        </li>
        <li v-if="entries.length === 0" class="py-8 text-center text-sm text-ww-muted">
          暂无条目，点击刷新拉取
        </li>
      </ul>
    </div>
  </div>
</template>
