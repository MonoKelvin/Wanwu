<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { MusicSongComment } from '@shared/types/music'
import '@modules/music/styles/music-popover.css'

const visible = defineModel<boolean>('visible', { default: false })

const props = defineProps<{
  songId: string
  title?: string
  /** 评论按钮，面板右上角对齐按钮左下角 */
  anchorEl?: HTMLElement | null
}>()

const comments = ref<MusicSongComment[]>([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(false)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })

const PANEL_GAP = 8
const VIEWPORT_PAD = 10

async function load(pageNum = 1) {
  if (!props.songId) return
  loading.value = true
  try {
    const data = await window.wanwu.music.getPlatformSongComments(props.songId, pageNum)
    if (pageNum === 1) comments.value = data.comments
    else comments.value = [...comments.value, ...data.comments]
    hasMore.value = !!data.hasMore
    page.value = pageNum
  } finally {
    loading.value = false
    if (visible.value) void nextTick(updatePanelPosition)
  }
}

function close() {
  visible.value = false
}

function updatePanelPosition() {
  const anchor = props.anchorEl
  const panel = panelRef.value
  if (!anchor || !panel) return

  const rect = anchor.getBoundingClientRect()
  const pw = panel.offsetWidth
  const ph = panel.offsetHeight
  const vw = window.innerWidth
  const vh = window.innerHeight

  let left = rect.left - pw
  let top = rect.bottom + PANEL_GAP

  if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
  if (left + pw > vw - VIEWPORT_PAD) left = vw - VIEWPORT_PAD - pw
  if (top + ph > vh - VIEWPORT_PAD) {
    top = rect.top - PANEL_GAP - ph
  }
  if (top < VIEWPORT_PAD) top = VIEWPORT_PAD

  panelStyle.value = {
    top: `${top}px`,
    left: `${left}px`
  }
}

function onDocPointerDown(e: PointerEvent) {
  if (!visible.value) return
  const panel = panelRef.value
  const anchor = props.anchorEl
  const target = e.target as Node
  if (panel?.contains(target) || anchor?.contains(target)) return
  close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

function bindGlobal() {
  document.addEventListener('pointerdown', onDocPointerDown, true)
  document.addEventListener('keydown', onKeydown)
  window.addEventListener('resize', updatePanelPosition)
  window.addEventListener('scroll', updatePanelPosition, true)
}

function unbindGlobal() {
  document.removeEventListener('pointerdown', onDocPointerDown, true)
  document.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updatePanelPosition)
  window.removeEventListener('scroll', updatePanelPosition, true)
}

watch(
  () => [visible.value, props.songId] as const,
  ([open, id]) => {
    if (open && id) void load(1)
  }
)

watch(visible, async (open) => {
  if (open) {
    bindGlobal()
    await nextTick()
    updatePanelPosition()
    await nextTick()
    updatePanelPosition()
  } else {
    unbindGlobal()
  }
})

watch(
  () => props.anchorEl,
  () => {
    if (visible.value) void nextTick(updatePanelPosition)
  }
)

onUnmounted(unbindGlobal)
</script>

<template>
  <Teleport to="body">
    <Transition name="ww-music-comments-pop">
      <aside
        v-show="visible"
        ref="panelRef"
        class="ww-music-comments-popover ww-music-popover"
        role="dialog"
        aria-label="歌曲评论"
        :style="panelStyle"
        @pointerdown.stop
      >
        <header class="ww-music-comments-popover__head">
          <h2 class="ww-music-comments-popover__title">
            {{ title ? `${title} · 评论` : '歌曲评论' }}
          </h2>
          <button type="button" class="ww-music-comments-popover__close" aria-label="关闭" @click="close">
            <WwIcon name="x" size="sm" />
          </button>
        </header>

        <div class="ww-music-comments">
          <p v-if="loading && !comments.length" class="ww-music-state-hint">加载中…</p>
          <ul v-else-if="comments.length" class="ww-music-comments__list ww-scrollbar">
            <li v-for="item in comments" :key="item.id" class="ww-music-comments__item">
              <div class="ww-music-comments__head">
                <strong class="ww-music-comments__user">{{ item.userName }}</strong>
                <div class="ww-music-comments__meta">
                  <span v-if="item.likedCount" class="ww-music-comments__likes">
                    <WwIcon name="thumbs-up" size="xs" />
                    {{ item.likedCount }}
                  </span>
                  <span v-if="item.time" class="ww-music-comments__time">{{ item.time }}</span>
                </div>
              </div>
              <p class="ww-music-comments__content">{{ item.content }}</p>
            </li>
          </ul>
          <p v-else class="ww-music-state-hint">暂无评论</p>
          <div v-if="hasMore" class="ww-music-comments__more">
            <button
              type="button"
              class="ww-music-comments__load-more"
              :disabled="loading"
              @click="load(page + 1)"
            >
              加载更多
            </button>
          </div>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ww-music-comments-popover {
  position: fixed;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  width: min(24rem, calc(100vw - 1.25rem));
  max-height: min(64vh, 32rem);
  padding: 0.75rem 0.85rem 0.85rem;
  border-radius: 0.75rem;
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
  transform-origin: top right;
}

.ww-music-comments-popover__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid color-mix(in srgb, var(--ww-glass-border) 75%, transparent);
}

.ww-music-comments-popover__title {
  margin: 0;
  min-width: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: -0.01em;
  color: var(--ww-ink);
}

.ww-music-comments-popover__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  margin: -0.15rem -0.2rem 0 0;
  padding: 0;
  border: none;
  border-radius: var(--ww-radius-full);
  background: transparent;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    color 0.16s var(--ww-ease-out),
    background 0.16s var(--ww-ease-out);
}

.ww-music-comments-popover__close:hover {
  color: var(--ww-ink);
  background: color-mix(in srgb, var(--ww-ink) 6%, transparent);
}

.ww-music-comments {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ww-music-comments__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  min-height: 0;
  max-height: min(58vh, 28rem);
  overflow-y: auto;
  padding-right: 0.35rem;
  margin-right: -0.15rem;
  scrollbar-gutter: stable;
}

.ww-music-comments__item {
  padding: 0.85rem 0.15rem 0.85rem 0;
  border-bottom: 1px solid color-mix(in srgb, var(--ww-glass-border) 70%, transparent);
}

.ww-music-comments__item:last-child {
  border-bottom: none;
  padding-bottom: 0.25rem;
}

.ww-music-comments__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.ww-music-comments__user {
  font-size: 0.8125rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--ww-accent);
}

.ww-music-comments__meta {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  flex-shrink: 0;
}

.ww-music-comments__likes {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  font-size: 0.6875rem;
  font-weight: 600;
  color: #d97706;
}

[data-theme='dark'] .ww-music-comments__likes {
  color: #fbbf24;
}

.ww-music-comments__time {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--ww-ink-faint);
}

.ww-music-comments__content {
  margin: 0.45rem 0 0;
  font-size: 0.875rem;
  line-height: 1.58;
  color: var(--ww-ink-muted);
  word-break: break-word;
}

.ww-music-comments__more {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}

.ww-music-comments__load-more {
  padding: 0.25rem 0.5rem;
  border: none;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ww-accent);
  cursor: pointer;
  transition:
    color 0.16s var(--ww-ease-out),
    opacity 0.16s var(--ww-ease-out);
}

.ww-music-comments__load-more:hover:not(:disabled) {
  color: color-mix(in srgb, var(--ww-accent) 82%, var(--ww-ink));
}

.ww-music-comments__load-more:disabled {
  opacity: 0.55;
  cursor: default;
}

.ww-music-comments-pop-enter-active,
.ww-music-comments-pop-leave-active {
  transition:
    opacity 0.18s var(--ww-ease-out),
    transform 0.2s cubic-bezier(0.34, 1.05, 0.64, 1);
}

.ww-music-comments-pop-enter-from,
.ww-music-comments-pop-leave-to {
  opacity: 0;
  transform: scale(0.96) translateY(-4px);
}
</style>
