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
  display: grid;
  grid-template-columns: minmax(10rem, 0.82fr) minmax(14rem, 1.25fr);
  gap: 2rem;
  flex: 1;
  min-height: 0;
  padding: 1.5rem 2rem;
}

.ww-mode-gallery__cover {
  align-self: center;
  justify-self: center;
  width: min(100%, 16.5rem);
  margin: 0.35rem 0 0 2.35rem;
  transform: translate(0.55rem, 0.15rem);
}

.ww-mode-gallery__lyrics {
  min-height: 0;
  overflow: hidden;
}
</style>
