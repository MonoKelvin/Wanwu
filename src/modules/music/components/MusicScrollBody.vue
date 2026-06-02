<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { musicScrollKey } from '@modules/music/lib/musicScrollKey'
import { musicScrollPositions } from '@modules/music/stores/musicScrollPositions'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    scrollKey?: string
    variant?: 'tab' | 'search'
  }>(),
  { variant: 'tab' }
)

const route = useRoute()
const root = ref<HTMLElement | null>(null)
const key = computed(() => props.scrollKey ?? musicScrollKey(route))

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

onActivated(() => {
  nextTick(restoreScroll)
})

onDeactivated(saveScroll)

watch(key, (next, prev) => {
  if (prev && prev !== next) saveScroll()
  nextTick(restoreScroll)
})

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
  </div>
</template>
