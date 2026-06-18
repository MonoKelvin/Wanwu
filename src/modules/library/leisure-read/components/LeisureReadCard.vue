<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { LeisureReadContent } from '@modules/library/leisure-read/domain/types'
import { useLeisureReadStore } from '@modules/library/leisure-read/services/leisureReadStore'
import QuoteBody from '@modules/library/leisure-read/components/QuoteBody.vue'
import JokeReactions from '@modules/library/leisure-read/components/JokeReactions.vue'
import ArticleBody from '@modules/library/leisure-read/components/ArticleBody.vue'
import RiddleReveal from '@modules/library/leisure-read/components/RiddleReveal.vue'
import LeisureReadLoader from '@modules/library/leisure-read/components/LeisureReadLoader.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { ArticleSnippetPayload } from '@modules/library/leisure-read/components/ArticleBody.vue'

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
  openFavorites: []
  favoriteSnippet: [payload: ArticleSnippetPayload]
  removeSnippet: [payload: ArticleSnippetPayload]
}>()

const store = useLeisureReadStore()
const copied = ref(false)
const favBurst = ref(false)
let copyResetTimer: ReturnType<typeof setTimeout> | null = null
let favBurstTimer: ReturnType<typeof setTimeout> | null = null

const isQuote = computed(() => props.content?.tab === 'quote')
const isJoke = computed(() => props.content?.tab === 'joke')
const isRiddle = computed(() => props.content?.tab === 'riddle')
const isArticle = computed(() => props.content?.tab === 'article')

const contentKey = computed(() =>
  props.content ? `${props.content.tab}:${props.content.contentId}` : 'empty'
)

const cardTabClass = computed(() =>
  props.content ? `lr-card--${props.content.tab}` : ''
)

const showActions = computed(() => Boolean(props.content) || (!props.loading && !props.error))

const nextTooltip = { value: '下一条', showDelay: 1000 }

async function handleCopy() {
  if (!props.content) return
  await navigator.clipboard.writeText(store.copyText(props.content))
  copied.value = true
  if (copyResetTimer) clearTimeout(copyResetTimer)
  copyResetTimer = setTimeout(() => {
    copied.value = false
  }, 2000)
}

function handleFavorite() {
  if (!props.favorited) {
    favBurst.value = true
    if (favBurstTimer) clearTimeout(favBurstTimer)
    favBurstTimer = setTimeout(() => {
      favBurst.value = false
    }, 720)
  }
  emit('toggleFavorite')
}

onBeforeUnmount(() => {
  if (copyResetTimer) clearTimeout(copyResetTimer)
  if (favBurstTimer) clearTimeout(favBurstTimer)
})
</script>

<template>
  <article class="lr-card" :class="cardTabClass">
    <div class="lr-card__inner">
      <div v-if="error && !content && !loading" class="lr-card__state lr-card__state--error">
        <WwIcon name="triangle-alert" size="lg" class="lr-card__state-icon" />
        <p>当前内容源暂时不可用，已尝试切换备用线路</p>
        <button type="button" class="lr-card__dock-btn" @click="emit('retry')">
          <WwIcon name="refresh-cw" size="xs" />
          重试
        </button>
      </div>

      <div v-else-if="!content && !loading" class="lr-card__state">
        <WwIcon name="book-open" size="lg" class="lr-card__state-icon" />
        <p>轻触中间按钮开始阅读</p>
      </div>

      <template v-else>
        <div class="lr-card__body" :class="{ 'is-loading': loading }">
          <LeisureReadLoader v-if="loading && !content" />
          <Transition v-else-if="content" name="lr-content" mode="out-in">
            <div :key="contentKey" class="lr-card__content">
              <QuoteBody
                v-if="isQuote"
                :body="content.body"
                :footer="content.footer"
              />
              <template v-else-if="isJoke">
                <div class="lr-joke">
                  <p v-if="content.subtitle" class="lr-joke__setup">{{ content.subtitle }}</p>
                  <p class="lr-joke__punchline">{{ content.body }}</p>
                  <JokeReactions />
                </div>
              </template>
              <RiddleReveal
                v-else-if="isRiddle"
                :question="content.body"
                :answer="content.answer ?? ''"
              />
              <ArticleBody
                v-else-if="isArticle"
                :title="content.title"
                :html="content.htmlBody"
                :plain="content.body"
                :initial-highlight-ranges="content.highlightRanges"
                @favorite-snippet="emit('favoriteSnippet', $event)"
                @remove-snippet="emit('removeSnippet', $event)"
              />
            </div>
          </Transition>
          <LeisureReadLoader v-if="loading && content" overlay />
        </div>

        <div v-if="showActions" class="lr-card__actions">
          <div class="lr-card__actions-side">
            <button
              type="button"
              class="lr-card__action-btn"
              :class="{ 'is-success': copied }"
              v-tooltip.bottom="copied ? '已复制' : '复制'"
              @click="handleCopy"
            >
              <Transition name="lr-icon-swap" mode="out-in">
                <WwIcon
                  :key="copied ? 'check' : 'copy'"
                  :name="copied ? 'check' : 'copy'"
                  size="sm"
                />
              </Transition>
            </button>
            <button
              type="button"
              class="lr-card__action-btn lr-card__action-btn--fav"
              :class="{ 'is-active': favorited, 'is-burst': favBurst }"
              :aria-pressed="favorited"
              v-tooltip.bottom="favorited ? '取消收藏' : '收藏'"
              @click="handleFavorite"
            >
              <span class="lr-fav-btn__inner" :class="{ 'is-burst': favBurst }">
                <span class="lr-fav-burst" aria-hidden="true">
                  <i v-for="n in 8" :key="n" class="lr-fav-burst__ray" :style="{ '--lr-ray-i': n }" />
                </span>
                <WwIcon name="star" size="sm" :filled="favorited" />
              </span>
            </button>
          </div>

          <button
            type="button"
            class="lr-card__next-btn"
            :disabled="loading"
            v-tooltip.bottom="nextTooltip"
            aria-label="下一条"
            @click="emit('next')"
          >
            <span class="lr-card__next-icon" aria-hidden="true">
              <WwIcon name="shuffle" size="sm" />
            </span>
          </button>

          <div class="lr-card__actions-side lr-card__actions-side--right">
            <button
              type="button"
              class="lr-card__action-btn"
              v-tooltip.bottom="'我的收藏'"
              @click="emit('openFavorites')"
            >
              <WwIcon name="inbox" size="sm" />
            </button>
          </div>
        </div>
      </template>
    </div>
  </article>
</template>
