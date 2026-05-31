<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import MusicVolumeSlider from '@modules/music/player/components/MusicVolumeSlider.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import '@modules/music/styles/music-popover.css'

withDefaults(
  defineProps<{
    compact?: boolean
    disabled?: boolean
  }>(),
  {
    compact: false,
    disabled: false
  }
)

const player = useMusicPlayerStore()
const rootRef = ref<HTMLElement | null>(null)
const panelOpen = ref(false)
const panelStyle = ref<{ left: string; bottom: string }>({ left: '0px', bottom: '0px' })
let closeTimer: ReturnType<typeof setTimeout> | null = null

const muteLabel = computed(() => (player.muted ? '取消静音' : '静音'))

function updatePanelPosition() {
  const el = rootRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  panelStyle.value = {
    left: `${rect.left + rect.width / 2}px`,
    bottom: `${window.innerHeight - rect.top + 6}px`
  }
}

function openPanel() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
  panelOpen.value = true
  void nextTick(updatePanelPosition)
}

function scheduleClose() {
  closeTimer = setTimeout(() => {
    panelOpen.value = false
  }, 160)
}

function onToggleMute() {
  player.toggleMute()
}

watch(panelOpen, (open) => {
  if (!open) return
  updatePanelPosition()
  window.addEventListener('scroll', updatePanelPosition, true)
  window.addEventListener('resize', updatePanelPosition)
})

watch(panelOpen, (open) => {
  if (open) return
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
})

onUnmounted(() => {
  window.removeEventListener('scroll', updatePanelPosition, true)
  window.removeEventListener('resize', updatePanelPosition)
  if (closeTimer) clearTimeout(closeTimer)
})
</script>

<template>
  <div
    ref="rootRef"
    class="ww-music-volume"
    :class="{ 'ww-music-volume--compact': compact, 'is-open': panelOpen }"
    @mouseenter="openPanel"
    @mouseleave="scheduleClose"
  >
    <button
      type="button"
      class="ww-music-glass-chip"
      :class="{ 'ww-music-glass-chip--compact': compact }"
      :aria-label="muteLabel"
      :disabled="disabled"
      @click="onToggleMute"
    >
      <WwIcon :name="player.volumeIcon" size="sm" />
    </button>

    <Teleport to="body">
      <Transition name="ww-music-volume-panel">
        <div
          v-show="panelOpen"
          class="ww-music-volume__panel ww-music-popover"
          :style="{ left: panelStyle.left, bottom: panelStyle.bottom }"
          @mouseenter="openPanel"
          @mouseleave="scheduleClose"
        >
          <MusicVolumeSlider />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.ww-music-volume {
  position: relative;
  display: inline-flex;
  align-items: center;
  z-index: 2;
}

.ww-music-volume__panel {
  position: fixed;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem 0.55rem;
  z-index: 1200;
}

.ww-music-volume-panel-enter-active,
.ww-music-volume-panel-leave-active {
  transition:
    opacity 0.16s var(--ww-ease-out),
    transform 0.18s cubic-bezier(0.34, 1.05, 0.64, 1);
}

.ww-music-volume-panel-enter-from,
.ww-music-volume-panel-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(4px) scale(0.96);
}
</style>
