<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useScrollNearEnd } from '@modules/music/composables/useScrollNearEnd'
import { readMusicViewCache, writeMusicViewCache } from '@modules/music/lib/musicViewCache'
import type { MusicChartCard, MusicChartSection } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicChartsView' })

const router = useRouter()
const { buildBrowseId, platformId } = useMusicPlatform()
const scrollBodyRef = ref<InstanceType<typeof MusicScrollBody> | null>(null)
const scrollRoot = computed(() => scrollBodyRef.value?.scrollEl ?? null)
const sections = ref<MusicChartSection[]>([])
const loading = ref(true)
const loadingMore = ref(false)
const initialized = ref(false)
const visibleCount = ref(18)
const CHART_BATCH = 18

function sectionCards(section: MusicChartSection & { cards?: MusicChartCard[] }): MusicChartCard[] {
  if (section.cards?.length) return section.cards
  if (!Array.isArray(section.items)) return []
  return section.items.filter((item): item is MusicChartCard => 'browseId' in (item as object))
}

const cacheKey = computed(() => `charts-page:${platformId.value}`)
const allCards = computed(() =>
  sections.value.flatMap((section) =>
    sectionCards(section).map((card) => ({
      sectionTitle: section.title,
      card
    }))
  )
)
const visibleCards = computed(() => allCards.value.slice(0, visibleCount.value))
const hasMore = computed(() => visibleCount.value < allCards.value.length)

async function loadCharts() {
  const cached = readMusicViewCache<MusicChartSection[]>(cacheKey.value)
  if (cached?.length) {
    sections.value = cached
    visibleCount.value = Math.min(CHART_BATCH, allCards.value.length)
    loading.value = false
    return
  }

  loading.value = true
  try {
    const data = await window.wanwu.music.getCharts()
    sections.value = data.sections ?? []
    visibleCount.value = Math.min(CHART_BATCH, allCards.value.length)
    if (sections.value.length) writeMusicViewCache(cacheKey.value, sections.value)
  } finally {
    loading.value = false
  }
}

onActivated(() => {
  if (initialized.value) return
  initialized.value = true
  void loadCharts()
})

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    await new Promise((resolve) => setTimeout(resolve, 120))
    visibleCount.value = Math.min(visibleCount.value + CHART_BATCH, allCards.value.length)
  } finally {
    loadingMore.value = false
  }
}

useScrollNearEnd(scrollRoot, loadMore, {
  enabled: computed(() => !loading.value && hasMore.value)
})

function openToplist(card: MusicChartCard) {
  const id = card.browseId ?? buildBrowseId('toplist', card.playlistId ?? '')
  if (!id) return
  void router.push({ name: 'music-toplist', params: { browseId: encodeURIComponent(id) } })
}
</script>

<template>
  <MusicScrollBody ref="scrollBodyRef">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="排行榜" subtitle="官方榜单与热门趋势" />

      <template v-if="loading">
        <div class="ww-music-charts-grid ww-music-skeleton">
          <div v-for="n in 12" :key="n" class="ww-music-charts-grid__item">
            <div class="ww-music-charts-grid__sk-cover" />
            <div class="ww-music-charts-grid__sk-line ww-music-charts-grid__sk-line--title" />
            <div class="ww-music-charts-grid__sk-line ww-music-charts-grid__sk-line--sub" />
          </div>
        </div>
      </template>
      <template v-else>
        <div v-if="visibleCards.length" class="ww-music-charts-grid">
          <button
            v-for="item in visibleCards"
            :key="item.card.playlistId ?? item.card.browseId ?? `${item.sectionTitle}-${item.card.title}`"
            type="button"
            class="ww-music-charts-grid__item"
            @click="openToplist(item.card)"
          >
            <MusicCover :src="item.card.coverUrl" :title="item.card.title" size="card" class="ww-music-charts-grid__cover" />
            <span class="ww-music-charts-grid__title ww-music-text-ellipsis">{{ item.card.title }}</span>
            <span class="ww-music-charts-grid__sub ww-music-text-ellipsis">
              {{ item.card.subtitle || item.sectionTitle }}
            </span>
          </button>
        </div>
        <p v-if="loadingMore" class="ww-music-state-hint">加载中…</p>
        <p v-if="!sections.length" class="ww-music-state-hint">暂无排行榜数据</p>
      </template>
    </div>
  </MusicScrollBody>
</template>

<style scoped>
.ww-music-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 1rem 0.75rem;
}

.ww-music-charts-grid__item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: none;
  background: transparent;
  padding: 0;
  min-width: 0;
  text-align: left;
  cursor: pointer;
}

.ww-music-charts-grid__cover {
  width: 100%;
  aspect-ratio: 1;
}

.ww-music-charts-grid__title {
  font-size: var(--ww-music-fs-sm, 0.75rem);
  color: var(--ww-ink);
}

.ww-music-charts-grid__sub {
  font-size: var(--ww-music-fs-xs, 0.6875rem);
  color: var(--ww-ink-faint);
}

.ww-music-charts-grid__sk-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0.55rem;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-charts-grid__sk-line {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-charts-grid__sk-line--title {
  width: 72%;
}

.ww-music-charts-grid__sk-line--sub {
  width: 48%;
}
</style>
