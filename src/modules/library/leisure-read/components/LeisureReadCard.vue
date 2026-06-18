<script setup lang="ts">
import { computed } from 'vue'
import type { LeisureReadContent } from '@modules/library/leisure-read/domain/types'
import ArticleBody from '@modules/library/leisure-read/components/ArticleBody.vue'
import RiddleReveal from '@modules/library/leisure-read/components/RiddleReveal.vue'

const props = defineProps<{
  content: LeisureReadContent | undefined
  loading: boolean
  error: string | undefined
  favorited: boolean
}>()

const emit = defineEmits<{
  next: []
  retry: []
  toggleFavorite: []
  copy: []
  openFavorites: []
}>()

const showRiddle = computed(() => props.content?.tab === 'riddle')
const showArticle = computed(() => props.content?.tab === 'article')
</script>

<template>
  <div class="lr-card">
    <div v-if="loading" class="lr-card__state">加载中…</div>
    <div v-else-if="error" class="lr-card__state lr-card__state--error">
      <p>当前内容源暂时不可用，已尝试切换备用线路</p>
      <button type="button" class="lr-card__btn" @click="emit('retry')">重试</button>
    </div>
    <template v-else-if="content">
      <div class="lr-card__body">
        <p v-if="content.title" class="lr-card__title">{{ content.title }}</p>
        <p v-if="content.subtitle" class="lr-card__subtitle">{{ content.subtitle }}</p>
        <RiddleReveal
          v-if="showRiddle"
          :key="content.contentId"
          :question="content.body"
          :answer="content.answer ?? ''"
        />
        <ArticleBody
          v-else-if="showArticle"
          :html="content.htmlBody"
          :plain="content.body"
        />
        <p v-else class="lr-card__text">{{ content.body }}</p>
        <p v-if="content.footer" class="lr-card__footer">{{ content.footer }}</p>
      </div>
      <div class="lr-card__toolbar">
        <button type="button" class="lr-card__btn" @click="emit('toggleFavorite')">
          {{ favorited ? '已收藏' : '收藏' }}
        </button>
        <button type="button" class="lr-card__btn" @click="emit('copy')">复制</button>
        <button type="button" class="lr-card__btn lr-card__btn--primary" @click="emit('next')">
          下一条
        </button>
        <button type="button" class="lr-card__btn" @click="emit('openFavorites')">我的收藏</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.lr-card {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.5rem;
  border-radius: 1rem;
  border: 1px solid var(--ww-border-subtle, rgba(128, 128, 128, 0.2));
  background: var(--ww-glass-bg, rgba(255, 255, 255, 0.04));
  backdrop-filter: blur(12px);
  min-height: 16rem;
}

.lr-card__state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--ww-text-secondary);
  text-align: center;
}

.lr-card__state--error p {
  margin: 0;
  max-width: 28rem;
  line-height: 1.6;
}

.lr-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lr-card__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.lr-card__subtitle {
  margin: 0;
  color: var(--ww-text-secondary);
}

.lr-card__text {
  margin: 0;
  font-size: 1.125rem;
  line-height: 1.75;
  white-space: pre-wrap;
}

.lr-card__footer {
  margin: 0.5rem 0 0;
  color: var(--ww-text-secondary);
  font-size: 0.875rem;
}

.lr-card__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lr-card__btn {
  padding: 0.45rem 0.85rem;
  border-radius: 0.5rem;
  border: 1px solid var(--ww-border-subtle, rgba(128, 128, 128, 0.25));
  background: transparent;
  color: var(--ww-text-primary);
  cursor: pointer;
  font-size: 0.875rem;
}

.lr-card__btn--primary {
  background: var(--ww-accent, #6366f1);
  border-color: transparent;
  color: #fff;
}
</style>
