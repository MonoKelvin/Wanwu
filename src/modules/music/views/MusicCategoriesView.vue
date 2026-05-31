<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicMoodGrid from '@modules/music/components/MusicMoodGrid.vue'
import type { MusicMoodCategory } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicCategoriesView' })

const router = useRouter()
const moods = ref<MusicMoodCategory[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function loadMoods() {
  loading.value = true
  error.value = null
  try {
    moods.value = await window.wanwu.music.getMoods()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

onMounted(() => void loadMoods())

function openMood(id: string) {
  void router.push({ name: 'music-mood', params: { categoryId: id } })
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="分类" subtitle="按心情与场景浏览歌单" />

      <div v-if="error" class="ww-music-error-bar">
      <span>{{ error }}</span>
      <button type="button" class="text-ww-accent" @click="loadMoods">重试</button>
    </div>

    <div v-if="loading" class="ww-music-categories-skeleton">
      <div v-for="n in 8" :key="n" class="ww-music-categories-skeleton__card" />
    </div>

    <MusicMoodGrid v-else-if="moods.length" :moods="moods" @select="openMood" />
    <p v-else class="text-sm text-ww-ink-faint">暂无分类数据</p>
    </div>
  </div>
</template>

<style scoped>
.ww-music-categories-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.75rem, 1fr));
  gap: 0.85rem;
}

.ww-music-categories-skeleton__card {
  aspect-ratio: 1;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  background: linear-gradient(
    115deg,
    var(--ww-surface-hover) 0%,
    color-mix(in srgb, var(--ww-surface-hover) 55%, transparent) 45%,
    var(--ww-surface-hover) 90%
  );
  background-size: 200% 200%;
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}
</style>
