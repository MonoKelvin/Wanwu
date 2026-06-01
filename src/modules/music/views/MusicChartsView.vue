<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartCarousel from '@modules/music/components/MusicChartCarousel.vue'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import type { MusicChartCard, MusicChartSection } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

const router = useRouter()
const { buildBrowseId } = useMusicPlatform()
const sections = ref<MusicChartSection[]>([])
const loading = ref(true)

function sectionCards(section: MusicChartSection & { cards?: MusicChartCard[] }): MusicChartCard[] {
  if (section.cards?.length) return section.cards
  if (!Array.isArray(section.items)) return []
  return section.items.filter((item): item is MusicChartCard => 'browseId' in (item as object))
}

onMounted(async () => {
  loading.value = true
  try {
    const data = await window.wanwu.music.getCharts()
    sections.value = data.sections ?? []
  } finally {
    loading.value = false
  }
})

function openToplist(card: MusicChartCard) {
  const id = card.browseId ?? buildBrowseId('toplist', card.playlistId ?? '')
  if (!id) return
  void router.push({ name: 'music-toplist', params: { browseId: encodeURIComponent(id) } })
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="排行榜" subtitle="官方榜单与热门趋势" />

      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <template v-else>
        <section v-for="section in sections" :key="section.title" class="ww-music-charts-section">
          <h2 class="ww-music-section-title">{{ section.title }}</h2>
          <MusicChartCarousel v-if="sectionCards(section).length" :cards="sectionCards(section)" @select="openToplist" />
          <p v-else class="ww-music-state-hint">暂无榜单</p>
        </section>
        <p v-if="!sections.length" class="ww-music-state-hint">暂无排行榜数据</p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ww-music-charts-section + .ww-music-charts-section {
  margin-top: 1.5rem;
}

.ww-music-section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--ww-text-secondary);
}
</style>
