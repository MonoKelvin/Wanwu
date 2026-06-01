<script setup lang="ts">
import MusicLyricsPanel from '@modules/music/player/components/MusicLyricsPanel.vue'
</script>

<template>
  <div class="ww-mode-immersion">
    <MusicLyricsPanel variant="immersion" />
  </div>
</template>

<style scoped>
.ww-mode-immersion {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0.5rem 1.25rem 0.75rem;
  overflow: visible;
}
</style>
