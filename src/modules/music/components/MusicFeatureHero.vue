<script setup lang="ts">
import { computed } from 'vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import type { NormalizedTrack } from '@modules/music/domain/types'

const props = defineProps<{
  title: string
  subtitle?: string
  tracks?: NormalizedTrack[]
  icon?: string
}>()
</script>

<template>
  <header class="ww-music-feature-hero">
    <div v-if="tracks?.length" class="ww-music-feature-hero__covers">
      <div
        v-for="(track, i) in tracks.slice(0, 4)"
        :key="track.trackKey + i"
        class="ww-music-feature-hero__cover"
      >
        <MusicCover
          :src="track.coverUrl"
          :video-id="track.videoId"
          :provider="track.provider"
          :title="track.title"
          size="thumb"
        />
      </div>
    </div>
    <div v-else class="ww-music-feature-hero__covers" aria-hidden="true">
      <div v-for="n in 4" :key="n" class="ww-music-feature-hero__cover" />
    </div>
    <div class="ww-music-feature-hero__body">
      <h2 class="ww-music-feature-hero__title">{{ title }}</h2>
      <p v-if="subtitle" class="ww-music-feature-hero__sub">{{ subtitle }}</p>
    </div>
  </header>
</template>
