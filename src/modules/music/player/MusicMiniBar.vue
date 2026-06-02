<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import WwMarqueeText from '@shared/components/WwMarqueeText.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import MusicProgressBar from '@modules/music/components/MusicProgressBar.vue'
import MusicGlassPlayButton from '@modules/music/player/components/MusicGlassPlayButton.vue'
import MusicVolumeControl from '@modules/music/player/components/MusicVolumeControl.vue'
import { parseLrc, lrcLineAt } from '@modules/music/composables/parseLrc'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const router = useRouter()
const player = useMusicPlayerStore()

const hasTrack = computed(() => !!player.currentTrack)
const isFavorite = computed(() => player.isFavorite(player.currentTrack))
const trackKey = computed(() => player.currentTrack?.trackKey ?? 'empty')

const titleText = computed(() => {
  if (!hasTrack.value) return '未在播放'
  const title = player.currentTrack!.title
  const artist = player.currentTrack!.artist?.trim()
  return artist ? `${title} — ${artist}` : title
})

const instantLyric = computed(() => {
  const raw = player.lyricsLrc
  if (!hasTrack.value || !raw?.includes('[')) return ''
  const lines = parseLrc(raw)
  if (!lines.length) return ''
  const idx = lrcLineAt(lines, player.progress)
  return idx >= 0 ? lines[idx]?.text ?? '' : ''
})

const metaSecondary = computed(() => {
  if (!hasTrack.value) return '选择歌曲开始播放'
  return instantLyric.value
})

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
          <div v-if="hasTrack && player.currentTrack" class="ww-music-minibar__cover-wrap">
            <Transition name="ww-minibar-cover" mode="out-in">
              <MusicCover
                :key="trackKey"
                :src="player.currentTrack.coverUrl"
                :video-id="player.currentTrack.videoId"
                :provider="player.currentTrack.provider"
                :title="player.currentTrack.title"
                size="thumb"
                shape="square"
                priority
                class="ww-music-minibar__cover"
              />
            </Transition>
          </div>
          <span v-else class="ww-music-minibar__cover ww-music-minibar__cover--empty" aria-hidden="true">
            <WwIcon name="disc-3" size="sm" />
          </span>
          <span class="ww-music-minibar__meta">
            <Transition name="ww-minibar-meta" mode="out-in">
              <span :key="trackKey" class="ww-music-minibar__meta-inner">
                <WwMarqueeText :text="titleText" class="ww-music-minibar__title" />
                <WwMarqueeText
                  v-if="metaSecondary"
                  :text="metaSecondary"
                  class="ww-music-minibar__artist"
                  :class="{ 'is-lyric': hasTrack && !!instantLyric }"
                />
              </span>
            </Transition>
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
    0 -12px 32px -8px color-mix(in srgb, var(--ww-ink) 10%, transparent),
    0 -4px 14px -6px color-mix(in srgb, var(--ww-ink) 6%, transparent);
  transform: translateY(-2px);
}

.ww-music-minibar.ww-glass-blur::before {
  background: color-mix(in srgb, var(--ww-glass-bg-soft) 72%, transparent);
}

[data-theme='dark'] .ww-music-minibar.ww-glass-blur {
  box-shadow:
    0 -1px 0 rgb(255 255 255 / 0.05),
    0 -14px 36px -10px rgb(0 0 0 / 0.38),
    0 -4px 14px -6px rgb(0 0 0 / 0.22);
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

.ww-music-minibar__cover-wrap {
  position: relative;
  width: 2.85rem;
  height: 2.85rem;
  flex-shrink: 0;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  overflow: hidden;
}

.ww-music-minibar__cover-wrap .ww-music-minibar__cover {
  position: absolute;
  inset: 0;
}

.ww-minibar-cover-enter-active {
  transition:
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-minibar-cover-leave-active {
  transition:
    opacity 0.16s cubic-bezier(0.55, 0, 1, 0.45),
    transform 0.18s cubic-bezier(0.55, 0, 1, 0.45);
}

.ww-minibar-cover-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.ww-minibar-cover-leave-to {
  opacity: 0;
  transform: scale(1.06);
}

.ww-minibar-meta-enter-active {
  transition:
    opacity 0.26s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-minibar-meta-leave-active {
  transition:
    opacity 0.14s cubic-bezier(0.55, 0, 1, 0.45),
    transform 0.16s cubic-bezier(0.55, 0, 1, 0.45);
}

.ww-minibar-meta-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.ww-minibar-meta-leave-to {
  opacity: 0;
  transform: translateY(-4px);
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
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ww-music-minibar__meta-inner {
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
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
  line-height: 1.25;
}

.ww-music-minibar__artist.is-lyric {
  color: color-mix(in srgb, var(--ww-ink) 72%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .ww-minibar-cover-enter-active,
  .ww-minibar-cover-leave-active,
  .ww-minibar-meta-enter-active,
  .ww-minibar-meta-leave-active {
    transition-duration: 0.01ms;
  }

  .ww-minibar-cover-enter-from,
  .ww-minibar-cover-leave-to,
  .ww-minibar-meta-enter-from,
  .ww-minibar-meta-leave-to {
    transform: none;
  }
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
