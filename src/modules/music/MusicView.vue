<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import MusicTopChrome from '@modules/music/components/MusicTopChrome.vue'
import MusicSearchResults from '@modules/music/components/MusicSearchResults.vue'
import { useMusicSearch } from '@modules/music/composables/useMusicSearch'
import { useMusicAccount } from '@modules/music/composables/useMusicAccount'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import '@modules/music/styles/music-shared.css'
import '@modules/music/styles/music-controls.css'
import '@modules/music/styles/music-layout.css'
import '@modules/music/styles/music-player.css'

defineOptions({ name: 'MusicView' })

const route = useRoute()
const search = useMusicSearch()
const player = useMusicPlayerStore()
useMusicAccount()

const isFullscreen = computed(() => !!route.meta.fullscreen)

watch(
  () => route.meta.fullscreen,
  (fullscreen) => {
    if (fullscreen) search.clear()
  }
)

onMounted(() => {
  void player.restoreSession()
})
</script>

<template>
  <div class="ww-music-shell flex h-full min-h-0 flex-col overflow-hidden">
    <MusicTopChrome v-if="!isFullscreen" />
    <div class="flex min-h-0 flex-1 flex-col overflow-hidden ww-music-stage">
      <Transition name="ww-music-search-view" mode="out-in">
        <MusicSearchResults v-if="!isFullscreen && search.isActive" key="search" />
        <RouterView v-else key="route" v-slot="{ Component }">
          <Transition name="ww-music-page" mode="out-in">
            <KeepAlive include="MusicDiscoverView,MusicCategoriesView,MusicMineView">
              <component
                :is="Component"
                :key="route.name"
                class="ww-music-page min-h-0 flex-1"
              />
            </KeepAlive>
          </Transition>
        </RouterView>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.ww-music-stage {
  position: relative;
}

.ww-music-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(
      ellipse 70% 45% at 12% 0%,
      color-mix(in srgb, var(--ww-accent) 4%, transparent),
      transparent 58%
    ),
    radial-gradient(
      ellipse 55% 40% at 88% 8%,
      color-mix(in srgb, var(--ww-accent) 3%, transparent),
      transparent 62%
    );
}

.ww-music-search-view-enter-active,
.ww-music-search-view-leave-active {
  transition:
    opacity 0.26s var(--ww-ease-out),
    transform 0.3s cubic-bezier(0.34, 1.05, 0.64, 1),
    filter 0.26s var(--ww-ease-out);
}

.ww-music-search-view-enter-from {
  opacity: 0;
  transform: translateY(8px) scale(0.988);
  filter: blur(2px);
}

.ww-music-search-view-leave-to {
  opacity: 0;
  transform: translateY(-4px) scale(0.992);
  filter: blur(1px);
}

.ww-music-page-enter-active,
.ww-music-page-leave-active {
  transition:
    opacity 0.28s var(--ww-ease-out),
    transform 0.32s cubic-bezier(0.34, 1.05, 0.64, 1),
    filter 0.28s var(--ww-ease-out);
}

.ww-music-page-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.982);
  filter: blur(2px);
}

.ww-music-page-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.988);
  filter: blur(1px);
}
</style>
