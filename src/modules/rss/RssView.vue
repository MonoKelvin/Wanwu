<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import WwButton from '@shared/components/WwButton.vue'
import Skeleton from 'primevue/skeleton'
import { useRssStore } from '@shared/stores/rss'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { DEFAULT_RSS_DISPLAY } from '@shared/types/rss'
import ModulePageLayout from '@app/components/ModulePageLayout.vue'
import PageHeader from '@app/components/PageHeader.vue'
import EmptyState from '@app/components/EmptyState.vue'
import RssEntryCard from '@features/rss/RssEntryCard.vue'

const route = useRoute()
const rssStore = useRssStore()
const settingsStore = useSettingsStore()
const toast = useWanwuToast()
const loadingMore = ref(false)

const feedId = computed(() => route.params.feedId as string | undefined)
const currentFeed = computed(() => (feedId.value ? rssStore.getFeed(feedId.value) : undefined))
const display = computed(() => currentFeed.value?.display ?? DEFAULT_RSS_DISPLAY)
const isRefreshing = computed(() => rssStore.isFeedRefreshing(feedId.value))

onMounted(async () => {
  if (!settingsStore.loaded) await settingsStore.load()
  if (!rssStore.groups.length) await rssStore.loadAll()
})

async function refreshCurrentFeed(targetId = feedId.value, notifyOnError = false) {
  if (!targetId) return false
  const ok = await rssStore.refreshFeed(targetId)
  if (feedId.value !== targetId) return ok
  if (notifyOnError && !ok && rssStore.error) toast.error(rssStore.error)
  return ok
}

async function loadMore() {
  if (!feedId.value || loadingMore.value) return
  loadingMore.value = true
  await rssStore.loadMoreEntries(feedId.value)
  loadingMore.value = false
}

watch(
  feedId,
  async (id) => {
    if (!id) return
    rssStore.cancelPendingRefresh()
    rssStore.entries = []
    rssStore.entryTotal = 0
    await rssStore.loadEntries(id)
    if (feedId.value !== id) return
    await refreshCurrentFeed(id, false)
  },
  { immediate: true }
)
</script>

<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden">
    <ModulePageLayout class="min-h-0 flex-1">
      <template #header>
        <PageHeader
          :title="currentFeed?.title ?? 'RSS'"
          :subtitle="currentFeed?.accessWarning ? '境内可能无法稳定访问' : '资讯订阅'"
        >
          <template #actions>
            <WwButton
              v-if="feedId"
              icon="refresh-cw"
              :loading="isRefreshing"
              size="small"
              variant="outlined"
              v-tooltip.bottom="'重新拉取'"
              aria-label="重新拉取"
              @click="refreshCurrentFeed(feedId, true)"
            />
          </template>
        </PageHeader>
      </template>

      <EmptyState
      v-if="!feedId"
      variant="rss"
      title="选择订阅源"
      description="左侧选择分组与订阅，将自动拉取最新文章。"
    />

    <div
      v-else-if="isRefreshing && rssStore.entries.length === 0"
      class="ww-rss-list space-y-2.5"
    >
      <Skeleton v-for="i in 4" :key="i" height="6rem" class="!rounded-lg !bg-ww-panel" />
    </div>

    <EmptyState
      v-else-if="!isRefreshing && rssStore.entries.length === 0"
      variant="rss"
      code="FEED"
      title="尚无文章"
      description="该源暂无内容，或拉取失败。可点击右上角重试。"
    />

    <div v-else class="flex flex-col">
      <div class="ww-rss-list flex-1">
        <RssEntryCard
          v-for="entry in rssStore.entries"
          :key="entry.id"
          :entry="entry"
          :display="display"
          :feed-url="currentFeed?.url"
          :feed-icon-url="currentFeed?.iconUrl"
        />
      </div>

      <div v-if="rssStore.hasMoreEntries" class="ww-rss-load-more">
        <button
          type="button"
          class="ww-rss-load-more__btn"
          :disabled="loadingMore"
          @click="loadMore"
        >
          <i class="pi" :class="loadingMore ? 'pi-spin pi-spinner' : 'pi-arrow-down'" />
          <span>{{ loadingMore ? '加载中…' : `加载更多（每次 ${settingsStore.settings.rssFetchLimit} 条）` }}</span>
        </button>
        <p class="ww-rss-load-more__hint">
          已显示 {{ rssStore.entries.length }} / {{ rssStore.entryTotal }} 条
        </p>
      </div>
    </div>
    </ModulePageLayout>
  </div>
</template>
