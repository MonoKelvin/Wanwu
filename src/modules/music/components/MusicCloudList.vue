<script setup lang="ts">
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import type { NormalizedTrack } from '@shared/types/music'

defineProps<{
  tracks: NormalizedTrack[]
  loading?: boolean
  emptyText?: string
}>()

const emit = defineEmits<{
  play: [track: NormalizedTrack]
}>()
</script>

<template>
  <p v-if="loading" class="ww-music-state-hint">加载中…</p>
  <MusicChartList
    v-else-if="tracks.length"
    :tracks="tracks"
    panel
    show-provider
    @play="emit('play', $event)"
  />
  <p v-else class="ww-music-state-hint">{{ emptyText ?? '暂无内容' }}</p>
</template>
