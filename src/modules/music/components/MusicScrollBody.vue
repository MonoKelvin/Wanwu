<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import { musicScrollKey } from '@modules/music/lib/musicScrollKey'
import { musicScrollBodyKey } from '@modules/music/lib/musicScrollBodyKey'
import { musicScrollPositions } from '@modules/music/stores/musicScrollPositions'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    scrollKey?: string
    variant?: 'tab' | 'search'
    scrollTopFab?: boolean
  }>(),
  { variant: 'tab', scrollTopFab: false }
)

const route = useRoute()
const root = ref<HTMLElement | null>(null)
const key = computed(() => props.scrollKey ?? musicScrollKey(route))
const showScrollTop = ref(false)

provide(musicScrollBodyKey, root)

function saveScroll() {
  const el = root.value
  if (!el) return
  musicScrollPositions.set(key.value, el.scrollTop)
}

function restoreScroll() {
  const el = root.value
  if (!el) return
  const top = musicScrollPositions.get(key.value)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (root.value) root.value.scrollTop = top
    })
  })
}

function onScroll() {
  if (!props.scrollTopFab) return
  showScrollTop.value = (root.value?.scrollTop ?? 0) > 120
}

function scrollToTop() {
  root.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

onActivated(() => {
  nextTick(restoreScroll)
})

onDeactivated(saveScroll)

watch(key, (next, prev) => {
  if (prev && prev !== next) saveScroll()
  nextTick(restoreScroll)
})

watch(
  root,
  (el, _, onCleanup) => {
    if (!el) return
    el.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    onCleanup(() => el.removeEventListener('scroll', onScroll))
  },
  { immediate: true }
)

defineExpose({ scrollEl: root })
</script>

<template>
  <div
    ref="root"
    :class="[
      props.variant === 'search' ? 'ww-music-search-results' : 'ww-music-tab-body',
      'ww-scroll-main',
      $attrs.class
    ]"
    :data-scroll-key="key"
  >
    <slot />
    <button
      v-if="scrollTopFab && showScrollTop"
      type="button"
      class="ww-music-scroll-top-fab"
      aria-label="回到顶部"
      @click="scrollToTop"
    >
      <WwIcon name="chevron-up" size="sm" />
    </button>
  </div>
</template>

<style scoped>
.ww-music-scroll-top-fab {
  position: sticky;
  bottom: 1rem;
  margin-left: auto;
  margin-right: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--ww-glass-border);
  border-radius: var(--ww-radius-full);
  background: color-mix(in srgb, var(--ww-glass-bg-soft) 88%, transparent);
  color: var(--ww-ink);
  cursor: pointer;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ww-ink) 8%, transparent);
  z-index: 5;
  transition:
    opacity 0.2s var(--ww-ease-out),
    transform 0.2s var(--ww-ease-out);
}

.ww-music-scroll-top-fab:hover {
  transform: translateY(-2px);
}
</style>
