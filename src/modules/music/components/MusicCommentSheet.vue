<script setup lang="ts">
import { ref, watch } from 'vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { MusicSongComment } from '@shared/types/music'

const visible = defineModel<boolean>('visible', { default: false })

const props = defineProps<{
  songId: string
  title?: string
}>()

const comments = ref<MusicSongComment[]>([])
const loading = ref(false)
const page = ref(1)
const hasMore = ref(false)

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
  }
}

watch(
  () => [visible.value, props.songId] as const,
  ([open, id]) => {
    if (open && id) void load(1)
  }
)
</script>

<template>
  <WwGlassDialog
    :visible="visible"
    :header="title ? `${title} · 评论` : '歌曲评论'"
    width-class="w-[min(28rem,92vw)]"
    @update:visible="visible = $event"
  >
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
        <button type="button" class="ww-music-comments__load-more" :disabled="loading" @click="load(page + 1)">
          加载更多
        </button>
      </div>
    </div>
  </WwGlassDialog>
</template>

<style scoped>
.ww-music-comments__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: min(50vh, 24rem);
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
  transition: color 0.16s var(--ww-ease-out), opacity 0.16s var(--ww-ease-out);
}

.ww-music-comments__load-more:hover:not(:disabled) {
  color: color-mix(in srgb, var(--ww-accent) 82%, var(--ww-ink));
}

.ww-music-comments__load-more:disabled {
  opacity: 0.55;
  cursor: default;
}
</style>
