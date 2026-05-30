<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import type { CaNavItem } from '@modules/cloud-abode/shared/caNav'

defineOptions({ name: 'CaShellTabs' })

const props = defineProps<{
  items: readonly CaNavItem[]
  activeName: string
}>()

const emit = defineEmits<{
  navigate: [item: CaNavItem]
}>()

const navRef = ref<HTMLElement | null>(null)
const tabRefs = ref<(HTMLButtonElement | null)[]>([])
const indicator = ref({ left: 0, width: 0, ready: false })

const activeIndex = computed(() =>
  props.items.findIndex((item) => item.name === props.activeName)
)

function measure() {
  const nav = navRef.value
  const idx = activeIndex.value
  const tab = tabRefs.value[idx]
  if (!nav || !tab || idx < 0) {
    indicator.value = { ...indicator.value, ready: false }
    return
  }
  const navRect = nav.getBoundingClientRect()
  const tabRect = tab.getBoundingClientRect()
  indicator.value = {
    left: tabRect.left - navRect.left + nav.scrollLeft,
    width: tabRect.width,
    ready: true
  }
}

function setTabRef(el: HTMLButtonElement | null, index: number) {
  tabRefs.value[index] = el
}

let ro: ResizeObserver | null = null

onMounted(() => {
  void nextTick(measure)
  ro = new ResizeObserver(() => measure())
  if (navRef.value) ro.observe(navRef.value)
  window.addEventListener('resize', measure, { passive: true })
})

onUnmounted(() => {
  ro?.disconnect()
  window.removeEventListener('resize', measure)
})

watch(
  () => props.activeName,
  async () => {
    await nextTick()
    measure()
  }
)

watch(
  () => props.items.length,
  async () => {
    await nextTick()
    measure()
  }
)
</script>

<template>
  <nav ref="navRef" class="ww-ca-shell__nav" aria-label="云斋导航">
    <span
      class="ww-ca-shell__indicator"
      :class="{ 'ww-ca-shell__indicator--ready': indicator.ready }"
      :style="{ transform: `translateX(${indicator.left}px)`, width: `${indicator.width}px` }"
      aria-hidden="true"
    />
    <button
      v-for="(item, index) in items"
      :key="item.name"
      :ref="(el) => setTabRef(el as HTMLButtonElement | null, index)"
      type="button"
      class="ww-ca-shell__tab"
      :class="{ 'ww-ca-shell__tab--active': activeName === item.name }"
      @click="emit('navigate', item)"
    >
      {{ item.label }}
    </button>
  </nav>
</template>
