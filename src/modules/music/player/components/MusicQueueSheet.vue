<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const player = useMusicPlayerStore()
</script>

<template>
  <Transition name="ww-music-queue">
    <aside v-if="open" class="ww-music-queue" aria-label="播放队列">
      <header class="ww-music-queue__head">
        <span>播放列表 · {{ player.queue.length }}</span>
        <button type="button" class="ww-music-queue__close" aria-label="关闭" @click="emit('close')">
          <WwIcon name="x" size="sm" />
        </button>
      </header>
      <ol class="ww-music-queue__list">
        <li v-for="(t, i) in player.queue" :key="t.trackKey">
          <button
            type="button"
            class="ww-music-queue__row"
            :class="{ 'is-current': i === player.queueIndex }"
            @click="player.playAtIndex(i)"
          >
            <MusicCover :src="t.coverUrl" :title="t.title" size="thumb" class="ww-music-queue__cover" />
            <span class="ww-music-queue__meta">
              <span class="ww-music-queue__title">{{ t.title }}</span>
              <span class="ww-music-queue__artist">{{ t.artist }}</span>
            </span>
            <WwIcon v-if="i === player.queueIndex && player.isPlaying" name="volume-2" size="sm" />
          </button>
        </li>
      </ol>
    </aside>
  </Transition>
  <Transition name="ww-music-queue-backdrop">
    <div v-if="open" class="ww-music-queue-backdrop" @click="emit('close')" />
  </Transition>
</template>

<style scoped>
.ww-music-queue-backdrop {
  position: absolute;
  inset: 0;
  z-index: 35;
  background: color-mix(in srgb, var(--ww-ink) 25%, transparent);
}

[data-theme='dark'] .ww-music-queue-backdrop {
  background: color-mix(in srgb, black 62%, transparent);
}

.ww-music-queue {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: min(22rem, 92vw);
  background: color-mix(in srgb, var(--ww-glass-bg-soft) 72%, transparent);
  border-left: 1px solid var(--ww-glass-border);
  backdrop-filter: blur(24px) saturate(180%);
  box-shadow: -8px 0 32px color-mix(in srgb, var(--ww-ink) 12%, transparent);
}

[data-theme='dark'] .ww-music-queue {
  background: color-mix(in srgb, var(--ww-canvas) 92%, black);
  border-left-color: color-mix(in srgb, var(--ww-border-subtle) 80%, transparent);
  box-shadow: -10px 0 36px color-mix(in srgb, black 52%, transparent);
}

[data-theme='dark'] .ww-music-queue__head {
  border-bottom-color: color-mix(in srgb, var(--ww-border-subtle) 75%, transparent);
}

[data-theme='dark'] .ww-music-queue__row:hover {
  background: color-mix(in srgb, var(--ww-ink) 6%, transparent);
}

[data-theme='dark'] .ww-music-queue__row.is-current {
  background: color-mix(in srgb, var(--ww-accent) 14%, transparent);
}
.ww-music-queue__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 1px solid var(--ww-glass-border);
}
.ww-music-queue__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--ww-radius-full);
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    color 0.18s var(--ww-ease-out),
    transform 0.15s var(--ww-ease-out);
}
.ww-music-queue__close:hover {
  color: var(--ww-ink);
  transform: scale(1.06);
}
.ww-music-queue__list {
  list-style: none;
  margin: 0;
  padding: 0 0.5rem 1rem;
  overflow-y: auto;
  flex: 1;
}
.ww-music-queue__row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: none;
  border-radius: var(--ww-music-pill-radius);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s var(--ww-ease-out);
}
.ww-music-queue__row:hover {
  background: color-mix(in srgb, var(--ww-glass-bg-soft) 45%, transparent);
}
.ww-music-queue__row.is-current {
  background: color-mix(in srgb, var(--ww-accent) 10%, transparent);
}
.ww-music-queue__cover {
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
}
.ww-music-queue__meta {
  flex: 1;
  min-width: 0;
}
.ww-music-queue__title {
  display: block;
  font-size: 0.8125rem;
  color: var(--ww-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ww-music-queue__artist {
  display: block;
  font-size: 0.6875rem;
  color: var(--ww-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ww-music-queue-enter-active,
.ww-music-queue-leave-active {
  transition: transform 0.22s var(--ww-ease-out);
}
.ww-music-queue-enter-from,
.ww-music-queue-leave-to {
  transform: translateX(100%);
}
.ww-music-queue-backdrop-enter-active,
.ww-music-queue-backdrop-leave-active {
  transition: opacity 0.2s ease;
}
.ww-music-queue-backdrop-enter-from,
.ww-music-queue-backdrop-leave-to {
  opacity: 0;
}
</style>
