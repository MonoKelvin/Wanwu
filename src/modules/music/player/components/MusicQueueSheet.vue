<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import MusicPlayingBars from '@modules/music/components/MusicPlayingBars.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const player = useMusicPlayerStore()
const listRef = ref<HTMLElement | null>(null)

function scrollToCurrent() {
  const list = listRef.value
  if (!list) return
  const current = list.querySelector('.ww-music-queue__row.is-current') as HTMLElement | null
  if (!current) return
  const target = current.offsetTop - list.clientHeight / 2 + current.clientHeight / 2
  list.scrollTop = Math.max(0, target)
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    await nextTick()
    scrollToCurrent()
  }
)
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
      <ol ref="listRef" class="ww-music-queue__list ww-scrollbar">
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
            <MusicPlayingBars v-if="i === player.queueIndex && player.isPlaying" />
          </button>
        </li>
      </ol>
    </aside>
  </Transition>
  <div v-if="open" class="ww-music-queue-dismiss" aria-hidden="true" @click="emit('close')" />
</template>

<style scoped>
.ww-music-queue-dismiss {
  position: absolute;
  inset: 0;
  z-index: 35;
  background: transparent;
}

.ww-music-queue {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: min(22rem, 92vw);
  max-width: 100%;
  border-left: 1px solid color-mix(in srgb, var(--ww-glass-border) 82%, transparent);
  background: color-mix(in srgb, var(--ww-glass-bg) 78%, transparent);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  box-shadow: -16px 0 48px color-mix(in srgb, var(--ww-ink) 10%, transparent);
  will-change: transform;
}

[data-theme='dark'] .ww-music-queue {
  background: color-mix(in srgb, var(--ww-glass-bg) 72%, rgb(0 0 0 / 0.28));
  border-left-color: color-mix(in srgb, var(--ww-border-subtle) 70%, transparent);
  box-shadow: -18px 0 52px color-mix(in srgb, black 28%, transparent);
}

.ww-music-queue__head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: calc(var(--ww-titlebar-height) + 2.5rem);
  padding: calc(var(--ww-titlebar-height) + 0.5rem) 1rem 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-bottom: 1px solid color-mix(in srgb, var(--ww-glass-border) 75%, transparent);
  -webkit-app-region: drag;
  app-region: drag;
}

[data-theme='dark'] .ww-music-queue__head {
  border-bottom-color: color-mix(in srgb, var(--ww-border-subtle) 75%, transparent);
}

.ww-music-queue__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: var(--ww-music-inner-radius, 0.5rem);
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
  -webkit-app-region: no-drag;
  app-region: no-drag;
  transition:
    color 0.18s var(--ww-ease-out),
    background 0.18s var(--ww-ease-out);
}

.ww-music-queue__close:hover {
  color: var(--ww-ink);
  background: color-mix(in srgb, var(--ww-ink) 6%, transparent);
}

.ww-music-queue__list {
  list-style: none;
  margin: 0;
  padding: 0.35rem 0.5rem 1rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  scrollbar-gutter: stable;
}

.ww-music-queue__row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.45rem 0.65rem;
  border: none;
  border-radius: var(--ww-music-inner-radius, 0.625rem);
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

[data-theme='dark'] .ww-music-queue__row:hover {
  background: color-mix(in srgb, var(--ww-ink) 6%, transparent);
}

[data-theme='dark'] .ww-music-queue__row.is-current {
  background: color-mix(in srgb, var(--ww-accent) 14%, transparent);
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

.ww-music-queue__row.is-current .ww-music-queue__title {
  color: var(--ww-accent);
  font-weight: 600;
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
  transition: transform 0.36s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-music-queue-enter-from,
.ww-music-queue-leave-to {
  transform: translate3d(100%, 0, 0);
}
</style>
