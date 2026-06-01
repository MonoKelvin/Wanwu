<script setup lang="ts">
import { computed } from 'vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const player = useMusicPlayerStore()

const qualityLabel = computed(() => {
  switch (player.playbackQuality) {
    case 'lossless':
      return '无损'
    case 'hires':
      return 'Hi-Res'
    case 'exhigh':
      return '极高'
    case 'higher':
      return '较高'
    default:
      return '标准'
  }
})
</script>

<template>
  <button
    type="button"
    class="ww-music-glass-chip ww-music-quality-btn"
    aria-label="音质"
    v-tooltip.bottom="`音质：${qualityLabel}`"
    @click="player.cyclePlaybackQuality()"
  >
    {{ qualityLabel }}
  </button>
</template>

<style scoped>
.ww-music-quality-btn {
  width: auto;
  min-width: 2.5rem;
  padding-inline: 0.5625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
</style>
