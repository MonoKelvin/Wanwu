<script setup lang="ts">
import MusicPlayerHeroCover from '@modules/music/player/components/MusicPlayerHeroCover.vue'
import MusicLyricsPanel from '@modules/music/player/components/MusicLyricsPanel.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const player = useMusicPlayerStore()
</script>

<template>
  <div class="ww-mode-duet">
    <MusicPlayerHeroCover
      v-if="player.currentTrack"
      :src="player.currentTrack.coverUrl"
      :video-id="player.currentTrack.videoId"
      :provider="player.currentTrack.provider"
      :title="player.currentTrack.title"
      class="ww-mode-duet__cover"
    />
    <MusicLyricsPanel variant="duet" class="ww-mode-duet__lyrics" />
  </div>
</template>

<style scoped>
.ww-mode-duet {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 1.15rem;
  flex: 1;
  min-height: 0;
  padding: 1.25rem 1.5rem 1.5rem;
}

.ww-mode-duet__cover {
  width: min(18rem, 70vw);
  align-self: center;
  flex-shrink: 0;
}

.ww-mode-duet__cover :deep(.ww-music-player-hero-cover) {
  max-width: 100%;
  aspect-ratio: 1;
  margin: 0 auto;
}

.ww-mode-duet__cover :deep(.ww-music-player-hero-cover__frame) {
  border-radius: var(--ww-music-cover-radius, 1.25rem);
}

.ww-mode-duet__cover :deep(.ww-music-player-hero-cover__shadow) {
  border-radius: var(--ww-music-cover-radius, 1.25rem);
}

.ww-mode-duet__lyrics {
  width: 100%;
  flex: 1;
  min-height: 0;
  margin-top: -0.35rem;
}
</style>
