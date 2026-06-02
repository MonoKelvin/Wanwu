<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useScrollNearEnd } from '@modules/music/composables/useScrollNearEnd'
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
const hotComments = ref<MusicSongComment[]>([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(false)
const total = ref<number | undefined>()
const listRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const panelStyle = ref<{ top: string; left: string }>({ top: '0px', left: '0px' })
const commentScrollTops = new Map<string, number>()

const PANEL_GAP = 8
const VIEWPORT_PAD = 10

const titleLabel = computed(() => {
  if (!props.title) return '歌曲评论'
  if (total.value != null && total.value > 0) return `${props.title} · ${total.value} 条评论`
  return `${props.title} · 评论`
})

function saveListScroll() {
  const el = listRef.value
  if (!el || !props.songId) return
  commentScrollTops.set(props.songId, el.scrollTop)
}

function restoreListScroll() {
  const el = listRef.value
  if (!el || !props.songId) return
  const top = commentScrollTops.get(props.songId) ?? 0
  requestAnimationFrame(() => {
    if (listRef.value) listRef.value.scrollTop = top
  })
}

async function load(pageNum = 1) {
  if (!props.songId) return
  loading.value = true
  try {
    const data = await window.wanwu.music.getPlatformSongComments(props.songId, pageNum)
    if (pageNum === 1) {
      comments.value = data.comments
      hotComments.value = data.hotComments ?? []
    } else {
      comments.value = [...comments.value, ...data.comments]
    }
    hasMore.value = !!data.hasMore
    total.value = data.total
    page.value = pageNum
  } finally {
    loading.value = false
    if (visible.value) {
      await nextTick()
      updatePanelPosition()
      if (pageNum === 1) restoreListScroll()
    }
  }
}

async function loadMore() {
  if (loading.value || !hasMore.value) return
  await load(page.value + 1)
}

useScrollNearEnd(listRef, loadMore, {
  enabled: computed(() => visible.value && hasMore.value && !loading.value)
})

function close() {
  saveListScroll()
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
  ([open, id], prev) => {
    if (prev?.[0] && prev[1] && prev[1] !== id) saveListScroll()
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
            {{ titleLabel }}
          </h2>
          <button type="button" class="ww-music-comments-popover__close" aria-label="关闭" @click="close">
            <WwIcon name="x" size="sm" />
          </button>
        </header>

        <div class="ww-music-comments">
          <p v-if="loading && !comments.length && !hotComments.length" class="ww-music-state-hint">加载中…</p>
          <ul v-else-if="hotComments.length || comments.length" ref="listRef" class="ww-music-comments__list ww-scrollbar">
            <li v-if="hotComments.length" class="ww-music-comments__section-label">
              <WwIcon name="star" size="xs" />
              热门评论
            </li>
            <li
              v-for="item in hotComments"
              :key="`hot-${item.id}`"
              class="ww-music-comments__item"
            >
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
              <ul v-if="item.replies?.length" class="ww-music-comments__replies">
                <li v-for="reply in item.replies" :key="reply.id" class="ww-music-comments__reply">
                  <strong class="ww-music-comments__reply-user">{{ reply.userName }}</strong>
                  <span class="ww-music-comments__reply-text">{{ reply.content }}</span>
                </li>
              </ul>
            </li>
            <li v-if="hotComments.length && comments.length" class="ww-music-comments__section-label">
              <WwIcon name="message-circle" size="xs" />
              全部评论
            </li>
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
              <ul v-if="item.replies?.length" class="ww-music-comments__replies">
                <li v-for="reply in item.replies" :key="reply.id" class="ww-music-comments__reply">
                  <strong class="ww-music-comments__reply-user">{{ reply.userName }}</strong>
                  <span class="ww-music-comments__reply-text">{{ reply.content }}</span>
                </li>
              </ul>
            </li>
          </ul>
          <p v-else class="ww-music-state-hint">暂无评论</p>
          <p v-if="loading && (comments.length || hotComments.length)" class="ww-music-comments__loading-more">加载中…</p>
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

.ww-music-comments__section-label {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.15rem 0.15rem;
  font-size: var(--ww-music-fs-xs, 0.6875rem);
  font-weight: 600;
  letter-spacing: var(--ww-music-ls-label, 0.03em);
  text-transform: uppercase;
  color: var(--ww-ink-faint);
  border-bottom: none;
  list-style: none;
}

.ww-music-comments__replies {
  margin: 0.5rem 0 0;
  padding: 0.45rem 0.55rem;
  list-style: none;
  border-radius: var(--ww-radius-sm, 0.375rem);
  background: color-mix(in srgb, var(--ww-inset) 88%, transparent);
}

.ww-music-comments__reply {
  font-size: var(--ww-music-fs-sm, 0.75rem);
  line-height: var(--ww-music-lh-body, 1.45);
  color: var(--ww-ink-muted);
}

.ww-music-comments__reply + .ww-music-comments__reply {
  margin-top: 0.35rem;
}

.ww-music-comments__reply-user {
  font-weight: 600;
  color: var(--ww-ink);
  margin-right: 0.35rem;
}

.ww-music-comments__reply-text {
  word-break: break-word;
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

.ww-music-comments__loading-more {
  margin: 0.5rem 0 0;
  text-align: center;
  font-size: var(--ww-music-fs-sm, 0.75rem);
  color: var(--ww-ink-faint);
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
