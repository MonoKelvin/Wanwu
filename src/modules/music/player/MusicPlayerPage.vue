<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref } from 'vue'
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

function toggleComments() {
  commentsOpen.value = !commentsOpen.value
}

const commentSongId = computed(() => resolveCommentSongId(player.currentTrack))

const bgStyle = computed(() => {
  const url = player.currentTrack?.coverUrl
  if (!url) return {}
  return { '--ww-music-cover-url': `url("${url}")` }
})

function back() {
  router.back()
}

onDeactivated(() => {
  queueOpen.value = false
  commentsOpen.value = false
})
</script>

<template>
  <div class="ww-music-player-page" :style="bgStyle">
    <div class="ww-music-player-page__bg" aria-hidden="true" />
    <div class="ww-music-player-page__content">
      <header v-if="player.currentTrack" class="ww-music-player-page__head">
        <div class="ww-music-player-page__head-action ww-music-player-page__head-action--back">
          <button type="button" class="ww-music-nav-btn" aria-label="返回" @click="back">
            <WwIcon name="chevron-left" size="md" />
          </button>
        </div>
        <div class="ww-music-player-page__head-text">
          <h1>{{ player.currentTrack.title }}</h1>
          <p>{{ player.currentTrack.artist }}</p>
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
          v-show="player.layoutMode === 'gallery'"
          class="ww-music-player-page__mode"
        />
        <MusicModeDuet v-show="player.layoutMode === 'duet'" class="ww-music-player-page__mode" />
        <MusicModeImmersion
          v-show="player.layoutMode === 'immersion'"
          class="ww-music-player-page__mode"
        />
      </div>
      <footer class="ww-music-player-page__footer">
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
