<script setup lang="ts">
import MusicPlayerHeroCover from '@modules/music/player/components/MusicPlayerHeroCover.vue'
import MusicLyricsPanel from '@modules/music/player/components/MusicLyricsPanel.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const player = useMusicPlayerStore()
</script>

<template>
  <div class="ww-mode-gallery">
    <MusicPlayerHeroCover
      v-if="player.currentTrack"
      :src="player.currentTrack.coverUrl"
      :video-id="player.currentTrack.videoId"
      :provider="player.currentTrack.provider"
      :title="player.currentTrack.title"
      class="ww-mode-gallery__cover"
    />
    <MusicLyricsPanel variant="list" class="ww-mode-gallery__lyrics" />
  </div>
</template>

<style scoped>
.ww-mode-gallery {
  --ww-gallery-track-start: calc(2.35rem + 0.65rem);
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
  gap: 1.25rem;
  flex: 1;
  min-height: 0;
  width: 100%;
  max-width: 52rem;
  margin: 0 auto;
  padding: 0.5rem 0.35rem 0.75rem;
  align-items: stretch;
  overflow: visible;
}

.ww-mode-gallery__cover {
  justify-self: start;
  align-self: center;
  width: min(100%, 16.5rem);
  margin-left: var(--ww-gallery-track-start);
  transform: translateX(calc(100% / 3 - 100% / 5));
  padding: 0.75rem 0.5rem 1.25rem 0;
  overflow: visible;
}

.ww-mode-gallery__lyrics {
  min-height: 0;
  overflow: visible;
  display: flex;
  flex-direction: column;
  padding: 0.15rem 0 0.25rem;
}
</style>
