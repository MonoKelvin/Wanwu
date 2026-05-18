<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import RssAsyncThumb from '@features/rss/RssAsyncThumb.vue'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { formatRssDate, linkHost, stripHtml } from '@shared/utils/rss'
import {
  faviconFallbackFromFeedUrl,
  resolveEntryThumbIconUrl,
  resolveFeedIconUrl
} from '@shared/utils/rssIcon'
import type { RssThumbSource } from '@features/rss/RssAsyncThumb.vue'
import type { RssDisplayOptions, RssEntry } from '@shared/types/rss'

const props = defineProps<{
  entry: RssEntry
  display: RssDisplayOptions
  feedIconUrl?: string | null
  feedUrl?: string
}>()

const toast = useWanwuToast()

const summary = computed(() => (props.display.showSummary ? stripHtml(props.entry.summary) : ''))
const host = computed(() => (props.display.showHost ? linkHost(props.entry.link) : ''))
const dateLabel = computed(() =>
  props.display.showTime ? formatRssDate(props.entry.publishedAt) : ''
)

const entryImage = computed(() => props.entry.imageUrl?.trim() || '')

const thumbSources = computed((): RssThumbSource[] => {
  const list: RssThumbSource[] = []
  if (entryImage.value) {
    list.push({ url: entryImage.value, fit: 'cover' })
  }
  const iconPrimary = resolveEntryThumbIconUrl(
    props.entry.link,
    props.feedUrl,
    props.feedIconUrl
  )
  if (iconPrimary) list.push({ url: iconPrimary, fit: 'contain' })
  const link = props.entry.link || props.feedUrl
  if (link) {
    const iconFb = faviconFallbackFromFeedUrl(link)
    if (iconFb) list.push({ url: iconFb, fit: 'contain' })
  }
  if (props.feedUrl) {
    const feedIcon = resolveFeedIconUrl(props.feedUrl, props.feedIconUrl)
    if (feedIcon) list.push({ url: feedIcon, fit: 'contain' })
  }
  return list
})

function openLink() {
  if (props.entry.link) window.open(props.entry.link, '_blank', 'noopener')
}

async function copyLink() {
  if (!props.entry.link) return
  try {
    await navigator.clipboard.writeText(props.entry.link)
    toast.success('链接已复制')
  } catch {
    toast.error('复制失败')
  }
}
</script>

<template>
  <article class="ww-rss-card">
    <div
      v-if="display.showTitle || display.showSummary"
      class="ww-rss-card__thumb"
      aria-hidden="true"
    >
      <RssAsyncThumb :sources="thumbSources" placeholder-icon="pi pi-image" />
    </div>

    <div class="ww-rss-card__body min-w-0 flex-1">
      <h3 v-if="display.showTitle" class="ww-rss-card__title">
        <a
          v-if="entry.link"
          :href="entry.link"
          target="_blank"
          rel="noopener noreferrer"
          class="ww-rss-card__title-link"
        >
          {{ entry.title }}
        </a>
        <span v-else>{{ entry.title }}</span>
      </h3>

      <p v-if="summary" class="ww-rss-card__summary">{{ summary }}</p>

      <div v-if="dateLabel || host" class="ww-rss-card__meta">
        <time v-if="dateLabel" :datetime="entry.publishedAt">{{ dateLabel }}</time>
        <span v-if="host" class="ww-rss-card__host">{{ host }}</span>
      </div>
    </div>

    <div v-if="display.showOpen || display.showCopy" class="ww-rss-card__actions">
      <Button
        v-if="display.showOpen && entry.link"
        icon="pi pi-external-link"
        severity="secondary"
        text
        rounded
        size="small"
        v-tooltip.top="'在浏览器打开'"
        aria-label="在浏览器打开"
        @click="openLink"
      />
      <Button
        v-if="display.showCopy && entry.link"
        icon="pi pi-copy"
        severity="secondary"
        text
        rounded
        size="small"
        v-tooltip.top="'复制链接'"
        aria-label="复制链接"
        @click="copyLink"
      />
    </div>
  </article>
</template>
