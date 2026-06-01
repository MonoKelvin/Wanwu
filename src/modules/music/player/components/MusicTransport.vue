<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import MusicProgressBar from '@modules/music/components/MusicProgressBar.vue'
import MusicGlassPlayButton from '@modules/music/player/components/MusicGlassPlayButton.vue'
import MusicVolumeControl from '@modules/music/player/components/MusicVolumeControl.vue'
import MusicQualityControl from '@modules/music/player/components/MusicQualityControl.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const player = useMusicPlayerStore()

const emit = defineEmits<{
  toggleQueue: []
}>()

const isFavorite = computed(() => player.isFavorite(player.currentTrack))

const playModeLabel = computed(() => {
  if (player.playMode === 'shuffle') return '随机播放'
  if (player.playMode === 'single') return '单曲循环'
  return '顺序播放'
})

const modeIcon = computed(() => {
  if (player.playMode === 'shuffle') return 'shuffle' as const
  if (player.playMode === 'single') return 'refresh-cw' as const
  return 'list-music' as const
})
</script>

<template>
  <div class="ww-music-transport">
    <MusicProgressBar
      class="ww-music-transport__progress"
      :progress="player.progress"
      :duration="player.duration"
      @seek="player.seek"
    />

    <div class="ww-music-transport__grid">
      <div class="ww-music-transport__side ww-music-transport__side--start">
        <MusicVolumeControl />
        <button
          type="button"
          class="ww-music-glass-chip"
          aria-label="播放模式"
          v-tooltip.bottom="playModeLabel"
          @click="player.cyclePlayMode()"
        >
          <WwIcon :name="modeIcon" size="sm" />
        </button>
        <MusicQualityControl />
      </div>

      <div class="ww-music-transport__center">
        <button
          type="button"
          class="ww-music-glass-chip"
          aria-label="上一首"
          v-tooltip.bottom="'上一首'"
          @click="player.playPrev()"
        >
          <WwIcon name="chevron-left" size="md" />
        </button>
        <span v-tooltip.bottom="player.isPlaying ? '暂停' : '播放'">
          <MusicGlassPlayButton
            size="lg"
            :playing="player.isPlaying"
            :loading="player.loading"
            @click="player.togglePlay()"
          />
        </span>
        <button
          type="button"
          class="ww-music-glass-chip"
          aria-label="下一首"
          v-tooltip.bottom="'下一首'"
          @click="player.playNext()"
        >
          <WwIcon name="chevron-right" size="md" />
        </button>
      </div>

      <div class="ww-music-transport__side ww-music-transport__side--end">
        <button
          type="button"
          class="ww-music-glass-chip"
          :class="{ 'is-favorite': isFavorite }"
          aria-label="收藏"
          v-tooltip.bottom="isFavorite ? '取消收藏' : '收藏'"
          @click="player.toggleFavorite()"
        >
          <WwIcon name="heart" size="sm" :filled="isFavorite" />
        </button>
        <button
          type="button"
          class="ww-music-glass-chip"
          aria-label="播放列表"
          v-tooltip.bottom="'播放列表'"
          @click="emit('toggleQueue')"
        >
          <WwIcon name="list" size="sm" />
        </button>
        <button
          type="button"
          class="ww-music-glass-chip"
          aria-label="布局"
          v-tooltip.bottom="'切换布局'"
          @click="player.cycleLayoutMode()"
        >
          <WwIcon name="layout-grid" size="sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-music-transport {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  width: 100%;
  max-width: 52rem;
  margin: 0 auto;
}

.ww-music-transport__progress {
  width: 100%;
}

.ww-music-transport__grid {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.75rem;
}

.ww-music-transport__side {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.ww-music-transport__side--start {
  grid-column: 1;
  justify-self: start;
}

.ww-music-transport__side--end {
  grid-column: 3;
  justify-self: end;
}

.ww-music-transport__center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  grid-column: 2;
  justify-self: center;
}

.ww-music-transport__side .is-favorite {
  color: #e11d48;
}
</style>
