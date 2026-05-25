<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useLinkFavicon } from '@features/library/links/useLinkFavicon'

const props = withDefaults(
  defineProps<{
    url: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' }
)

defineOptions({ inheritAttrs: false })

const root = ref<HTMLElement | null>(null)
const { src, failed, pending, showImage, showFallback, onLoad, onError } = useLinkFavicon(() => props.url)

/** 浏览器缓存命中时 @load 可能早于骨架渲染，补检 complete */
watch([src, failed], async () => {
  if (!src.value || failed.value) return
  await nextTick()
  const img = root.value?.querySelector('img')
  if (img?.complete && img.naturalWidth > 0) onLoad()
})
</script>

<template>
  <span
    ref="root"
    class="ww-link-favicon"
    :class="[$attrs.class, `ww-link-favicon--${size}`]"
    aria-hidden="true"
  >
    <span v-if="pending" class="ww-link-favicon__skeleton" />
    <img
      v-if="src && !failed"
      v-show="showImage"
      :src="src"
      alt=""
      class="ww-link-favicon__img"
      decoding="async"
      @load="onLoad"
      @error="onError"
    />
    <WwIcon
      v-if="showFallback"
      name="globe"
      :size="size === 'sm' ? 'sm' : 'md'"
      class="ww-link-favicon__fallback"
    />
  </span>
</template>

<style>
.ww-link-favicon {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 0.25rem;
  overflow: hidden;
}

.ww-link-favicon__skeleton {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--ww-inset);
  overflow: hidden;
}

.ww-link-favicon__skeleton::after {
  content: '';
  position: absolute;
  inset: -60%;
  background: linear-gradient(
    115deg,
    transparent 38%,
    color-mix(in srgb, var(--ww-ink) 10%, transparent) 50%,
    transparent 62%
  );
  animation: ww-link-favicon-shimmer 1.35s ease-in-out infinite;
}

@keyframes ww-link-favicon-shimmer {
  from {
    transform: translate(-35%, -35%);
  }
  to {
    transform: translate(35%, 35%);
  }
}

.ww-link-favicon--sm {
  width: 2rem;
  height: 2rem;
}

.ww-link-favicon--md {
  width: 2.25rem;
  height: 2.25rem;
}

.ww-link-favicon__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.ww-link-favicon__fallback {
  color: var(--ww-ink-muted);
}

.ww-link-favicon:hover .ww-link-favicon__fallback {
  color: var(--ww-accent);
}
</style>
