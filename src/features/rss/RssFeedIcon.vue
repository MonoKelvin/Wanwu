<script setup lang="ts">
import { computed } from 'vue'
import RssAsyncThumb from '@features/rss/RssAsyncThumb.vue'
import {
  defaultRssFeedIconUrl,
  faviconFallbackFromFeedUrl,
  feedIconPlaceholderUrl,
  resolveFeedIconUrl
} from '@shared/utils/rssIcon'

const props = defineProps<{
  feedUrl?: string
  iconUrl?: string | null
  size?: 'sm' | 'md'
}>()

const siteUrl = computed(() => props.feedUrl?.trim() || '')
const isSidebar = computed(() => props.size !== 'md')
const faviconSz = computed(() => (isSidebar.value ? 32 : 64) as 32 | 64)

/** 侧栏：始终先显示站点 favicon / 默认 RSS 图；卡片区仍用 PrimeIcons 占位 */
const placeholderSrc = computed(() =>
  isSidebar.value ? feedIconPlaceholderUrl(siteUrl.value, faviconSz.value) : ''
)

const placeholderFallbackSrc = computed(() =>
  isSidebar.value ? defaultRssFeedIconUrl() : ''
)

const placeholderIcon = computed(() => (isSidebar.value ? '' : 'pi pi-image'))

const sources = computed(() => {
  if (!siteUrl.value) return []
  const ph = placeholderSrc.value
  const list: string[] = []

  const custom = props.iconUrl?.trim()
  if (custom && /^https?:\/\//i.test(custom) && custom !== ph) {
    list.push(custom)
  }

  const primary = resolveFeedIconUrl(siteUrl.value, props.iconUrl)
  if (primary && primary !== ph && !list.includes(primary)) {
    list.push(primary)
  }

  const fb = faviconFallbackFromFeedUrl(siteUrl.value)
  if (fb && fb !== ph && !list.includes(fb)) {
    list.push(fb)
  }

  return list
})
</script>

<template>
  <span class="ww-rss-icon" :class="props.size === 'md' ? 'ww-rss-icon--md' : 'ww-rss-icon--sm'">
    <RssAsyncThumb
      :sources="sources"
      :placeholder-src="placeholderSrc"
      :placeholder-fallback-src="placeholderFallbackSrc"
      :placeholder-icon="placeholderIcon || 'pi pi-image'"
    />
  </span>
</template>
