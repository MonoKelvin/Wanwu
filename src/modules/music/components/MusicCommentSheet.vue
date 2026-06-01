<script setup lang="ts">
import { ref, watch } from 'vue'
import WwGlassDialog from '@shared/components/WwGlassDialog.vue'
import WwButton from '@shared/components/WwButton.vue'
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
      <ul v-else-if="comments.length" class="ww-music-comments__list">
        <li v-for="item in comments" :key="item.id" class="ww-music-comments__item">
          <div class="ww-music-comments__head">
            <strong>{{ item.userName }}</strong>
            <span v-if="item.time" class="ww-music-comments__time">{{ item.time }}</span>
          </div>
          <p class="ww-music-comments__content">{{ item.content }}</p>
        </li>
      </ul>
      <p v-else class="ww-music-state-hint">暂无评论</p>
      <div v-if="hasMore" class="ww-music-comments__more">
        <WwButton variant="ghost" size="sm" :disabled="loading" @click="load(page + 1)">加载更多</WwButton>
      </div>
    </div>
  </WwGlassDialog>
</template>

<style scoped>
.ww-music-comments__list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-height: min(50vh, 24rem);
  overflow: auto;
}

.ww-music-comments__head {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.82rem;
}

.ww-music-comments__time {
  color: var(--ww-text-tertiary);
  flex-shrink: 0;
}

.ww-music-comments__content {
  margin-top: 0.25rem;
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--ww-text-secondary);
}

.ww-music-comments__more {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}
</style>
