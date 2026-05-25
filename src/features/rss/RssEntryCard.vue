<script setup lang="ts">
import { computed } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import RssAsyncThumb from '@features/rss/RssAsyncThumb.vue'
import { usePopTip } from '@shared/composables/usePopTip'
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

const popTip = usePopTip()

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

function copyLink() {
  if (!props.entry.link) return
  void popTip.copyLink(props.entry.link)
}
</script>

<template>
  <article class="ww-rss-card">
    <div
      v-if="display.showTitle || display.showSummary"
      class="ww-rss-card__thumb"
      aria-hidden="true"
    >
      <RssAsyncThumb :sources="thumbSources" placeholder-icon="image" />
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
      <WwButton
        v-if="display.showOpen && entry.link"
        icon="external-link"
        severity="secondary"
        text
        rounded
        size="small"
        v-tooltip.top="'在浏览器打开'"
        aria-label="在浏览器打开"
        @click="openLink"
      />
      <WwButton
        v-if="display.showCopy && entry.link"
        icon="copy"
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

<style>
.ww-rss-card {
  display: flex;
  align-items: flex-start;
  gap: 0.875rem;
  padding: 0.875rem 1rem;
  border: 1px solid var(--ww-border-subtle);
  border-radius: 0.625rem;
  background: var(--ww-content);
  box-shadow: none;
  transition:
    background var(--ww-duration) var(--ww-ease-out),
    transform var(--ww-duration) var(--ww-ease-out),
    box-shadow var(--ww-duration) var(--ww-ease-out),
    border-color var(--ww-duration) var(--ww-ease-out);
}

.ww-rss-card:hover {
  border-color: var(--ww-border-subtle);
  box-shadow: var(--ww-shadow-soft);
  transform: translateY(-2px);
}

.ww-rss-card__thumb,
.ww-rss-card__icon {
  display: flex;
  height: 3rem;
  width: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 0.5rem;
  background: var(--ww-inset);
  color: var(--ww-ink-muted);
}

.ww-rss-card__thumb > .ww-rss-async-thumb,
.ww-rss-card__icon > .ww-rss-async-thumb {
  width: 100%;
  height: 100%;
}

.ww-rss-card__title {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.4;
  color: var(--ww-ink);
}

.ww-rss-card__title-link {
  color: inherit;
  text-decoration: none;
  transition: color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-rss-card__title-link:hover {
  color: var(--ww-accent);
}

.ww-rss-card__summary {
  margin: 0.375rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--ww-ink-muted);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.ww-rss-card__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.625rem;
  margin-top: 0.5rem;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
}

.ww-rss-card__host::before {
  content: '·';
  margin-right: 0.375rem;
  opacity: 0.6;
}

.ww-rss-card__actions {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 0.125rem;
  margin-top: 0.125rem;
}
</style>
