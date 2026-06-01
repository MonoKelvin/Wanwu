<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import WwIcon from '@shared/components/WwIcon.vue'
import MusicModeGallery from '@modules/music/player/modes/MusicModeGallery.vue'
import MusicModeDuet from '@modules/music/player/modes/MusicModeDuet.vue'
import MusicModeImmersion from '@modules/music/player/modes/MusicModeImmersion.vue'
import MusicTransport from '@modules/music/player/components/MusicTransport.vue'
import MusicQueueSheet from '@modules/music/player/components/MusicQueueSheet.vue'
import MusicCommentSheet from '@modules/music/components/MusicCommentSheet.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import '@modules/music/styles/music-player.css'

const router = useRouter()
const player = useMusicPlayerStore()
const queueOpen = ref(false)
const commentsOpen = ref(false)

const modeComponent = computed(() => {
  if (player.layoutMode === 'duet') return MusicModeDuet
  if (player.layoutMode === 'immersion') return MusicModeImmersion
  return MusicModeGallery
})

const bgStyle = computed(() => {
  const url = player.currentTrack?.coverUrl
  if (!url) return {}
  return { '--ww-music-cover-url': `url("${url}")` }
})

function back() {
  router.back()
}
</script>

<template>
  <div class="ww-music-player-page" :style="bgStyle">
    <div class="ww-music-player-page__bg" aria-hidden="true" />
    <div class="ww-music-player-page__content">
      <header v-if="player.currentTrack" class="ww-music-player-page__head">
        <button
          type="button"
          class="ww-music-nav-btn ww-music-player-page__head-side"
          aria-label="返回"
          @click="back"
        >
          <WwIcon name="chevron-left" size="sm" />
        </button>
        <div class="ww-music-player-page__head-text">
          <h1>{{ player.currentTrack.title }}</h1>
          <p>{{ player.currentTrack.artist }}</p>
        </div>
        <button
          type="button"
          class="ww-music-nav-btn ww-music-player-page__head-side"
          aria-label="评论"
          @click="commentsOpen = true"
        >
          <WwIcon name="circle-help" size="sm" />
        </button>
      </header>
      <component :is="modeComponent" />
      <footer class="ww-music-player-page__footer">
        <MusicTransport @toggle-queue="queueOpen = !queueOpen" />
      </footer>
      <MusicQueueSheet :open="queueOpen" @close="queueOpen = false" />
      <MusicCommentSheet
        v-model:visible="commentsOpen"
        :song-id="player.currentTrack?.videoId ?? ''"
        :title="player.currentTrack?.title"
      />
    </div>
  </div>
</template>
