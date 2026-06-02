<script setup lang="ts">
import { computed, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import MusicModeGallery from '@modules/music/player/modes/MusicModeGallery.vue'
import MusicModeDuet from '@modules/music/player/modes/MusicModeDuet.vue'
import MusicModeImmersion from '@modules/music/player/modes/MusicModeImmersion.vue'
import MusicTransport from '@modules/music/player/components/MusicTransport.vue'
import MusicQueueSheet from '@modules/music/player/components/MusicQueueSheet.vue'
import MusicCommentSheet from '@modules/music/components/MusicCommentSheet.vue'
import { resolveCommentSongId } from '@modules/music/lib/resolveCommentSongId'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import '@modules/music/styles/music-player.css'

defineOptions({ name: 'MusicPlayerPage' })

const router = useRouter()
const player = useMusicPlayerStore()
const queueOpen = ref(false)
const commentsOpen = ref(false)
const commentBtnRef = ref<HTMLButtonElement | null>(null)
const chromeVisible = ref(true)
let idleTimer: ReturnType<typeof setTimeout> | null = null
const IDLE_MS = 3000

function toggleComments() {
  commentsOpen.value = !commentsOpen.value
}

const commentSongId = computed(() => resolveCommentSongId(player.currentTrack))
const trackKey = computed(() => player.currentTrack?.trackKey ?? 'empty')

const bgCoverStyle = computed(() => {
  const url = player.currentTrack?.coverUrl
  if (!url) return undefined
  return { '--ww-music-cover-url': `url("${url}")` } as Record<string, string>
})

const hideChrome = computed(
  () => player.layoutMode === 'immersion' && !chromeVisible.value && !queueOpen.value && !commentsOpen.value
)

function resetIdleTimer() {
  chromeVisible.value = true
  if (idleTimer) clearTimeout(idleTimer)
  if (player.layoutMode !== 'immersion') return
  idleTimer = setTimeout(() => {
    chromeVisible.value = false
  }, IDLE_MS)
}

function back() {
  router.back()
}

watch(
  () => player.layoutMode,
  () => resetIdleTimer()
)

watch([queueOpen, commentsOpen], () => resetIdleTimer())

onMounted(() => {
  window.addEventListener('pointerdown', resetIdleTimer, { passive: true })
  window.addEventListener('pointermove', resetIdleTimer, { passive: true })
  resetIdleTimer()
})

onUnmounted(() => {
  if (idleTimer) clearTimeout(idleTimer)
  window.removeEventListener('pointerdown', resetIdleTimer)
  window.removeEventListener('pointermove', resetIdleTimer)
})

onDeactivated(() => {
  queueOpen.value = false
  commentsOpen.value = false
  chromeVisible.value = true
})
</script>

<template>
  <div class="ww-music-player-page">
    <div class="ww-music-player-page__bg-slot" aria-hidden="true">
      <Transition name="ww-player-bg">
        <div
          v-if="bgCoverStyle"
          :key="trackKey"
          class="ww-music-player-page__bg"
          :style="bgCoverStyle"
        />
      </Transition>
    </div>
    <div class="ww-music-player-page__content">
      <header
        v-if="player.currentTrack"
        class="ww-music-player-page__head"
        :class="{ 'is-hidden': hideChrome }"
      >
        <div class="ww-music-player-page__head-action ww-music-player-page__head-action--back">
          <button type="button" class="ww-music-nav-btn" aria-label="返回" @click="back">
            <WwIcon name="chevron-left" size="md" />
          </button>
        </div>
        <div class="ww-music-player-page__head-text">
          <Transition name="ww-player-meta" mode="out-in">
            <div :key="trackKey" class="ww-music-player-page__head-text-inner">
              <h1>{{ player.currentTrack.title }}</h1>
              <p>{{ player.currentTrack.artist }}</p>
            </div>
          </Transition>
        </div>
        <div class="ww-music-player-page__head-action ww-music-player-page__head-action--comment">
          <button
            ref="commentBtnRef"
            type="button"
            class="ww-music-nav-btn"
            aria-label="评论"
            :aria-expanded="commentsOpen"
            @click="toggleComments"
          >
            <WwIcon name="message-circle" size="md" />
          </button>
        </div>
      </header>
      <div class="ww-music-player-page__stage">
        <MusicModeGallery
          v-if="player.layoutMode === 'gallery'"
          class="ww-music-player-page__mode"
        />
        <MusicModeDuet v-if="player.layoutMode === 'duet'" class="ww-music-player-page__mode" />
        <MusicModeImmersion
          v-if="player.layoutMode === 'immersion'"
          class="ww-music-player-page__mode"
        />
      </div>
      <footer class="ww-music-player-page__footer" :class="{ 'is-hidden': hideChrome }">
        <MusicTransport @toggle-queue="queueOpen = !queueOpen" />
      </footer>
      <MusicQueueSheet :open="queueOpen" @close="queueOpen = false" />
    </div>
    <MusicCommentSheet
      v-model:visible="commentsOpen"
      :anchor-el="commentBtnRef"
      :song-id="commentSongId"
      :title="player.currentTrack?.title"
    />
  </div>
</template>
