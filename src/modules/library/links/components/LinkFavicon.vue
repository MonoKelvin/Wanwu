<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useLinkFavicon } from '@modules/library/links/lib/useLinkFavicon'

const props = withDefaults(
  defineProps<{
    url: string
    size?: 'sm' | 'md'
  }>(),
  { size: 'md' }
)

defineOptions({ inheritAttrs: false })

const root = ref<HTMLElement | null>(null)
const {
  activeSrc,
  failed,
  pending,
  showImage,
  showFallback,
  onLoad,
  onError
} = useLinkFavicon(() => props.url)

const fallbackIconPx = computed(() => (props.size === 'sm' ? 16 : 18))

watch([activeSrc, failed], async () => {
  if (!activeSrc.value || failed.value) return
  await nextTick()
  const img = root.value?.querySelector('img.ww-link-favicon__img')
  if (img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0) {
    onLoad({ target: img } as unknown as Event)
  }
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
    <WwIcon
      v-if="showFallback"
      name="globe"
      :size="fallbackIconPx"
      class="ww-link-favicon__fallback"
    />
    <img
      v-if="activeSrc && !failed"
      v-show="showImage"
      :key="activeSrc"
      :src="activeSrc"
      alt=""
      class="ww-link-favicon__img"
      decoding="async"
      @load="onLoad"
      @error="onError"
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
  background: var(--ww-inset);
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
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.1875rem;
}

.ww-link-favicon__fallback {
  color: var(--ww-ink-muted);
  opacity: 0.88;
}

.ww-link-favicon:hover .ww-link-favicon__fallback {
  color: var(--ww-accent);
  opacity: 1;
}
</style>
