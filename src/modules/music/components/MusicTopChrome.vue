<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import MusicSearchBox from '@modules/music/components/MusicSearchBox.vue'
import { useMusicSearch } from '@modules/music/composables/useMusicSearch'
import { applyMainTabScrollReset } from '@modules/music/stores/musicScrollPositions'

const route = useRoute()
const router = useRouter()
const search = useMusicSearch()

const trackRef = ref<HTMLElement | null>(null)
const tabEls = ref<(HTMLElement | null)[]>([])
const indicator = ref({ left: 0, width: 0 })
const indicatorReady = ref(false)

const tabs = computed(() => [
  { name: 'music-discover', label: '发现' },
  { name: 'music-categories', label: '分类' },
  { name: 'music-mine', label: '我的' }
] as const)

const showBack = computed(() => {
  const name = route.name
  return (
    name === 'music-mood' ||
    name === 'music-album' ||
    name === 'music-artist' ||
    name === 'music-playlist' ||
    name === 'music-daily' ||
    name === 'music-fm' ||
    name === 'music-charts' ||
    name === 'music-toplist' ||
    name === 'music-new' ||
    name === 'music-artists' ||
    name === 'music-radio' ||
    name === 'music-radio-tracks' ||
    name === 'music-video' ||
    name === 'music-cloud'
  )
})

function isActive(name: string): boolean {
  if (route.name === name) return true
  if (name === 'music-discover') {
    return route.name === 'music-album' || route.name === 'music-artist'
  }
  if (name === 'music-categories') {
    return route.name === 'music-mood'
  }
  return false
}

function activeIndex(): number {
  const idx = tabs.value.findIndex((t) => isActive(t.name))
  return idx >= 0 ? idx : 0
}

function measureTarget(): { left: number; width: number } | null {
  const track = trackRef.value
  const el = tabEls.value[activeIndex()]
  if (!track || !el) return null
  const trackRect = track.getBoundingClientRect()
  const elRect = el.getBoundingClientRect()
  const barWidth = Math.max(18, Math.min(elRect.width * 0.5, 44))
  const left = elRect.left - trackRect.left + (elRect.width - barWidth) / 2
  return { left, width: barWidth }
}

async function updateIndicator(animate = true) {
  const target = measureTarget()
  if (!target) return

  if (!indicatorReady.value || !animate) {
    indicator.value = target
    indicatorReady.value = true
    return
  }

  const prevLeft = indicator.value.left
  const prevWidth = indicator.value.width
  const stretch = Math.max(prevWidth, target.width) * 1.65

  indicator.value = {
    left: prevLeft + (prevWidth - stretch) / 2,
    width: stretch
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  indicator.value = target
}

function setTabRef(el: unknown, index: number) {
  tabEls.value[index] = el instanceof HTMLElement ? el : null
}

function resetMainScroll() {
  applyMainTabScrollReset()
}

function go(name: string) {
  if (route.name === name) return
  search.clear()
  void router.push({ name }).then(() => {
    nextTick(() => resetMainScroll())
  })
}

function goBack() {
  if (window.history.length > 1) router.back()
  else if (route.name === 'music-mood') void router.push({ name: 'music-categories' })
  else void router.push({ name: 'music-discover' })
}

watch(
  () => [route.name, tabs.value.length],
  () => nextTick(() => updateIndicator(true))
)

const onResize = () => {
  void updateIndicator(false)
}

onMounted(() => {
  nextTick(() => updateIndicator(false))
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <header class="ww-music-top" aria-label="音乐导航">
    <div class="ww-music-top__bar">
      <div class="ww-music-top__side">
        <button
          v-if="showBack"
          type="button"
          class="ww-music-nav-btn"
          aria-label="返回"
          v-tooltip.bottom="'返回'"
          @click="goBack"
        >
          <WwIcon name="chevron-left" size="sm" />
        </button>
      </div>

      <div ref="trackRef" class="ww-music-top__tabs">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.name"
          :ref="(el) => setTabRef(el, index)"
          type="button"
          class="ww-music-top__tab"
          :class="{ 'is-active': isActive(tab.name) }"
          @click="go(tab.name)"
        >
          {{ tab.label }}
        </button>
        <span
          v-show="indicatorReady"
          class="ww-music-top__indicator"
          :style="{
            width: `${indicator.width}px`,
            transform: `translateX(${indicator.left}px)`
          }"
        />
      </div>

      <div class="ww-music-top__side ww-music-top__side--end">
        <MusicSearchBox />
      </div>
    </div>
  </header>
</template>

<style scoped>
.ww-music-top {
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  margin-top: calc(var(--ww-titlebar-height) + 0.75rem);
  padding: 0.35rem var(--ww-music-page-x, var(--ww-page-padding, 1.125rem)) 0.25rem;
  background: transparent;
  -webkit-app-region: no-drag;
}

.ww-music-top__bar {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: end;
  gap: 0.75rem;
  padding: 0;
  -webkit-app-region: no-drag;
}

.ww-music-top__side {
  display: flex;
  align-items: center;
  min-width: 0;
  padding-bottom: 0.55rem;
}

.ww-music-top__side--end {
  justify-content: flex-end;
  justify-self: end;
  width: 100%;
  max-width: 16rem;
  padding-bottom: 0.35rem;
}

.ww-music-top__tabs {
  position: relative;
  display: inline-flex;
  align-items: flex-end;
  justify-content: center;
  gap: 3.25rem;
  max-width: 100%;
  padding-bottom: 0.45rem;
  overflow-x: auto;
  scrollbar-width: none;
  justify-self: center;
}

.ww-music-top__tabs::-webkit-scrollbar {
  display: none;
}

.ww-music-top__indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 0.2rem;
  border-radius: var(--ww-radius-full);
  background: var(--ww-ink);
  pointer-events: none;
  transition:
    transform 0.48s cubic-bezier(0.45, 0.05, 0.25, 1),
    width 0.48s cubic-bezier(0.45, 0.05, 0.25, 1);
  will-change: transform, width;
}

.ww-music-top__tab {
  position: relative;
  flex: 0 0 auto;
  padding: 0.35rem 0.15rem;
  border: none;
  background: transparent;
  font-size: var(--ww-music-fs-md);
  font-weight: 500;
  color: var(--ww-ink-muted);
  cursor: pointer;
  white-space: nowrap;
  transition:
    color 0.28s var(--ww-ease-out),
    transform 0.2s cubic-bezier(0.34, 1.08, 0.64, 1),
    letter-spacing 0.28s var(--ww-ease-out);
}

.ww-music-top__tab:hover {
  color: var(--ww-ink);
}

.ww-music-top__tab:active {
  transform: scale(0.97);
}

.ww-music-top__tab.is-active {
  color: var(--ww-ink);
  font-weight: 700;
  letter-spacing: -0.01em;
}
</style>
