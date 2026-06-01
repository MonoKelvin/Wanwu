<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import WwMarqueeText from '@shared/components/WwMarqueeText.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import MusicProgressBar from '@modules/music/components/MusicProgressBar.vue'
import MusicGlassPlayButton from '@modules/music/player/components/MusicGlassPlayButton.vue'
import MusicVolumeControl from '@modules/music/player/components/MusicVolumeControl.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const router = useRouter()
const player = useMusicPlayerStore()

const hasTrack = computed(() => !!player.currentTrack)
const isFavorite = computed(() => player.isFavorite(player.currentTrack))

const titleText = computed(() =>
  hasTrack.value ? player.currentTrack!.title : '未在播放'
)
const artistText = computed(() =>
  hasTrack.value ? player.currentTrack!.artist : '选择歌曲开始播放'
)

const playModeLabel = computed(() => {
  if (player.playMode === 'shuffle') return '随机播放'
  if (player.playMode === 'single') return '单曲循环'
  return '顺序播放'
})

const playModeIcon = computed(() => {
  if (player.playMode === 'shuffle') return 'shuffle' as const
  if (player.playMode === 'single') return 'refresh-cw' as const
  return 'list-music' as const
})

function openPlayer() {
  if (!hasTrack.value) return
  void router.push({ name: 'music-player' })
}
</script>

<template>
  <div class="ww-music-minibar-slot">
    <div class="ww-music-minibar ww-glass-blur">
      <div class="ww-music-minibar__body">
        <button
          type="button"
          class="ww-music-minibar__main"
          :class="{ 'is-empty': !hasTrack }"
          :disabled="!hasTrack"
          @click="openPlayer"
        >
          <MusicCover
            v-if="hasTrack && player.currentTrack"
            :src="player.currentTrack.coverUrl"
            :video-id="player.currentTrack.videoId"
            :provider="player.currentTrack.provider"
            :title="player.currentTrack.title"
            size="thumb"
            shape="square"
            class="ww-music-minibar__cover"
          />
          <span v-else class="ww-music-minibar__cover ww-music-minibar__cover--empty" aria-hidden="true">
            <WwIcon name="disc-3" size="sm" />
          </span>
          <span class="ww-music-minibar__meta">
            <WwMarqueeText :text="titleText" class="ww-music-minibar__title" />
            <span class="ww-music-minibar__artist ww-music-text-ellipsis">{{ artistText }}</span>
          </span>
        </button>

        <div class="ww-music-minibar__controls">
          <button
            type="button"
            class="ww-music-glass-chip ww-music-glass-chip--compact"
            aria-label="上一首"
            v-tooltip.bottom="'上一首'"
            :disabled="!hasTrack"
            @click="player.playPrev()"
          >
            <WwIcon name="chevron-left" size="sm" />
          </button>
          <span v-tooltip.bottom="player.isPlaying ? '暂停' : '播放'">
            <MusicGlassPlayButton
              size="sm"
              :playing="player.isPlaying"
              :loading="player.loading"
              :disabled="!hasTrack"
              @click="hasTrack && player.togglePlay()"
            />
          </span>
          <button
            type="button"
            class="ww-music-glass-chip ww-music-glass-chip--compact"
            aria-label="下一首"
            v-tooltip.bottom="'下一首'"
            :disabled="!hasTrack"
            @click="player.playNext()"
          >
            <WwIcon name="chevron-right" size="sm" />
          </button>
          <button
            type="button"
            class="ww-music-glass-chip ww-music-glass-chip--compact"
            aria-label="播放模式"
            v-tooltip.bottom="playModeLabel"
            :disabled="!hasTrack"
            @click="player.cyclePlayMode()"
          >
            <WwIcon :name="playModeIcon" size="sm" />
          </button>
          <MusicVolumeControl compact :disabled="!hasTrack" />
          <button
            type="button"
            class="ww-music-glass-chip ww-music-glass-chip--compact"
            :class="{ 'is-favorite': isFavorite }"
            aria-label="收藏"
            v-tooltip.bottom="isFavorite ? '取消收藏' : '收藏'"
            :disabled="!hasTrack"
            @click="player.toggleFavorite()"
          >
            <WwIcon name="heart" size="sm" :filled="isFavorite" />
          </button>
        </div>
      </div>

      <MusicProgressBar
        class="ww-music-minibar__progress"
        :progress="player.progress"
        :duration="player.duration"
        @seek="player.seek"
      />
    </div>
  </div>
</template>

<style scoped>
.ww-music-minibar-slot {
  position: absolute;
  left: 0;
  right: 0;
  bottom: var(--ww-music-minibar-inset, 0.875rem);
  z-index: 20;
  display: flex;
  justify-content: center;
  padding: 0 max(1rem, 6vw);
  pointer-events: none;
}

.ww-music-minibar {
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  width: 100%;
  max-width: var(--ww-music-minibar-max-width, 44rem);
  border-radius: var(--ww-music-minibar-radius, 1rem);
  overflow: visible;
}

.ww-music-minibar.ww-glass-blur {
  border: 1px solid var(--ww-glass-border);
  box-shadow:
    0 -1px 0 color-mix(in srgb, white 55%, transparent),
    0 -8px 22px -6px color-mix(in srgb, var(--ww-ink) 7%, transparent),
    0 -3px 10px -4px color-mix(in srgb, var(--ww-ink) 4%, transparent);
  transform: translateY(-2px);
}

.ww-music-minibar.ww-glass-blur::before {
  background: color-mix(in srgb, var(--ww-glass-bg-soft) 72%, transparent);
}

[data-theme='dark'] .ww-music-minibar.ww-glass-blur {
  box-shadow:
    0 -1px 0 rgb(255 255 255 / 0.05),
    0 -10px 28px -8px rgb(0 0 0 / 0.32),
    0 -3px 12px -5px rgb(0 0 0 / 0.18);
}

.ww-music-minibar__body {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 4.25rem;
  padding: 0.5rem 0.85rem 0.15rem;
  border-radius: var(--ww-music-minibar-radius, 1rem) var(--ww-music-minibar-radius, 1rem) 0 0;
  overflow: hidden;
}

.ww-music-minibar__main {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  padding: 0;
}

.ww-music-minibar__main.is-empty,
.ww-music-minibar__main:disabled {
  cursor: default;
}

.ww-music-minibar__cover {
  width: 2.85rem;
  height: 2.85rem;
  flex-shrink: 0;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  overflow: hidden;
}

.ww-music-minibar__cover :deep(.ww-music-cover__frame) {
  border-radius: var(--ww-music-inner-radius, 0.875rem);
}

.ww-music-minibar__cover--empty {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  background: color-mix(in srgb, var(--ww-ink) 5%, transparent);
  color: var(--ww-ink-faint);
}

.ww-music-minibar__meta {
  flex: 1;
  min-width: 0;
}

.ww-music-minibar__title {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--ww-ink);
  line-height: 1.25;
}

.ww-music-minibar__artist {
  display: block;
  margin-top: 0.1rem;
  font-size: 0.75rem;
  color: var(--ww-ink-faint);
}

.ww-music-minibar__controls {
  display: flex;
  align-items: center;
  gap: 0.1rem;
  flex-shrink: 0;
  margin-left: auto;
}

.ww-music-minibar__controls .is-favorite {
  color: #e11d48;
}

.ww-music-minibar__progress {
  padding: 0 0.75rem 0.45rem;
}
</style>
