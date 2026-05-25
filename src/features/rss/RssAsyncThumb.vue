<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

export type RssThumbSource = {
  url: string
  fit?: 'cover' | 'contain'
}

const props = withDefaults(
  defineProps<{
    sources?: RssThumbSource[] | string[]
    placeholderIcon?: WwIconName
    placeholderSrc?: string
    placeholderFallbackSrc?: string
  }>(),
  {
    sources: () => [],
    placeholderIcon: 'image',
    placeholderSrc: '',
    placeholderFallbackSrc: ''
  }
)

const placeholderImgSrc = ref('')
const placeholderImgFallbackUsed = ref(false)

watch(
  () => [props.placeholderSrc, props.placeholderFallbackSrc] as const,
  () => {
    placeholderImgSrc.value = props.placeholderSrc?.trim() || ''
    placeholderImgFallbackUsed.value = false
  },
  { immediate: true }
)

function onPlaceholderImgError() {
  const fb = props.placeholderFallbackSrc?.trim()
  if (fb && !placeholderImgFallbackUsed.value) {
    placeholderImgFallbackUsed.value = true
    placeholderImgSrc.value = fb
  }
}

const activeIndex = ref(0)
const loaded = ref(false)
const exhausted = ref(false)
const imgRef = ref<HTMLImageElement | null>(null)

const normalized = computed((): RssThumbSource[] => {
  const list: RssThumbSource[] = []
  const seen = new Set<string>()
  for (const item of props.sources) {
    const url = (typeof item === 'string' ? item : item.url)?.trim()
    if (!url || seen.has(url)) continue
    seen.add(url)
    list.push(typeof item === 'string' ? { url, fit: 'contain' } : { url, fit: item.fit ?? 'contain' })
  }
  return list
})

const active = computed(() => {
  if (exhausted.value) return null
  return normalized.value[activeIndex.value] ?? null
})

const showImage = computed(() => Boolean(active.value?.url))

watch(
  normalized,
  () => {
    activeIndex.value = 0
    loaded.value = false
    exhausted.value = false
    nextTick(syncLoadedFromDom)
  },
  { deep: true }
)

watch(activeIndex, () => {
  loaded.value = false
  nextTick(syncLoadedFromDom)
})

function syncLoadedFromDom() {
  const img = imgRef.value
  if (!img || !active.value?.url) return
  if (img.complete && img.naturalWidth > 0) loaded.value = true
}

function onLoad() {
  loaded.value = true
}

function onError() {
  loaded.value = false
  if (activeIndex.value < normalized.value.length - 1) {
    activeIndex.value += 1
    return
  }
  exhausted.value = true
}
</script>

<template>
  <span class="ww-rss-async-thumb">
    <img
      v-if="placeholderImgSrc"
      :src="placeholderImgSrc"
      alt=""
      class="ww-rss-async-thumb__placeholder-img"
      @error="onPlaceholderImgError"
    />
    <WwIcon
      v-else-if="placeholderIcon"
      :name="placeholderIcon"
      size="sm"
      class="ww-rss-async-thumb__placeholder"
    />
    <img
      v-if="showImage"
      ref="imgRef"
      :key="active!.url"
      :src="active!.url"
      alt=""
      class="ww-rss-async-thumb__img"
      :class="[
        active!.fit === 'cover' ? 'ww-rss-async-thumb__img--cover' : 'ww-rss-async-thumb__img--contain',
        { 'ww-rss-async-thumb__img--loaded': loaded }
      ]"
      @load="onLoad"
      @error="onError"
    />
  </span>
</template>

<style>
.ww-rss-async-thumb {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-width: 100%;
  min-height: 100%;
}

.ww-rss-async-thumb__placeholder {
  flex-shrink: 0;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--ww-ink-faint);
  opacity: 0.5;
  pointer-events: none;
}

.ww-rss-async-thumb__placeholder-img {
  position: absolute;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.ww-rss-icon--sm .ww-rss-async-thumb__placeholder {
  font-size: 0.6875rem;
}

.ww-rss-async-thumb__img {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.15s var(--ww-ease-out);
}

.ww-rss-async-thumb__img--loaded {
  opacity: 1;
}

.ww-rss-async-thumb__img--cover {
  object-fit: cover;
}

.ww-rss-async-thumb__img--contain {
  object-fit: contain;
  padding: 0.375rem;
  background: var(--ww-elevated);
}
</style>
