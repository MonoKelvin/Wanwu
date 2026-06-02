<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import MusicGlassPlayButton from '@modules/music/player/components/MusicGlassPlayButton.vue'
import {
  listTrackCoverFallbacks,
  upgradeCoverUrl,
  type CoverSize
} from '@shared/utils/musicCoverUrl'
import type { NormalizedTrack } from '@shared/types/music'

const props = withDefaults(
  defineProps<{
    src?: string
    videoId?: string
    provider?: NormalizedTrack['provider']
    title?: string
    size?: CoverSize
    shape?: 'square' | 'circle'
    showPlay?: boolean
    shadowGlow?: boolean
    /** 当前播放封面等需立即加载 */
    priority?: boolean
  }>(),
  {
    size: 'card',
    shape: 'square',
    showPlay: false,
    shadowGlow: false,
    priority: false
  }
)

const emit = defineEmits<{ play: [] }>()

const focused = ref(false)
const fallbackIndex = ref(0)

const fallbackUrls = computed(() =>
  listTrackCoverFallbacks(
    {
      coverUrl: props.src,
      videoId: props.videoId,
      provider: props.provider,
      title: props.title
    },
    props.size
  )
)

const imageUrl = computed(() => {
  const list = fallbackUrls.value
  if (list.length) return list[Math.min(fallbackIndex.value, list.length - 1)]
  return upgradeCoverUrl(props.src, props.size)
})

const showImg = computed(() => !!imageUrl.value)

const imgLoading = computed(() =>
  props.priority || props.size === 'hero' ? 'eager' : 'lazy'
)

const imgFetchPriority = computed(() =>
  props.priority || props.size === 'hero' ? 'high' : 'auto'
)

function onImgError() {
  if (fallbackIndex.value < fallbackUrls.value.length - 1) {
    fallbackIndex.value += 1
  }
}

watch(
  () => [props.src, props.videoId, props.provider],
  () => {
    fallbackIndex.value = 0
  }
)

function onPlayClick() {
  emit('play')
}
</script>

<template>
  <div
    class="ww-music-cover"
    :class="[
      `ww-music-cover--${shape}`,
      { 'ww-music-cover--glow': shadowGlow && (focused || !showPlay) }
    ]"
    @mouseenter="focused = true"
    @mouseleave="focused = false"
  >
    <div class="ww-music-cover__frame">
      <div v-if="showPlay && focused" class="ww-music-cover__shade" @click.stop>
        <span class="ww-music-cover__play-glass">
          <MusicGlassPlayButton size="sm" @click="onPlayClick" />
        </span>
      </div>
      <img
        v-if="showImg"
        :src="imageUrl"
        :alt="title ?? ''"
        class="ww-music-cover__img"
        draggable="false"
        :loading="imgLoading"
        :fetchpriority="imgFetchPriority"
        referrerpolicy="no-referrer"
        @error="onImgError"
        @dragstart.prevent
      />
      <div v-else class="ww-music-cover__placeholder">
        <WwIcon name="disc-3" size="lg" />
      </div>
      <div
        v-if="shadowGlow && showImg && focused"
        class="ww-music-cover__shadow"
        :style="{ backgroundImage: `url(${imageUrl})` }"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
.ww-music-cover {
  position: relative;
  width: 100%;
  height: 100%;
}
.ww-music-cover__frame {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--ww-surface-raised);
  border-radius: var(--ww-music-cover-radius, var(--ww-radius-md));
}
.ww-music-cover--circle .ww-music-cover__frame {
  border-radius: 50%;
}
.ww-music-cover__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.2s ease;
  -webkit-user-drag: none;
  user-select: none;
}
.ww-music-cover:hover .ww-music-cover__img {
  transform: scale(1.02);
}
.ww-music-cover__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 3rem;
  color: var(--ww-ink-faint);
}
.ww-music-cover__shade {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--ww-ink) 8%, transparent);
}

.ww-music-cover__play-glass {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  aspect-ratio: 1;
  border-radius: 50%;
  overflow: hidden;
  background: color-mix(in srgb, var(--ww-glass-bg-soft) 58%, transparent);
  backdrop-filter: blur(14px) saturate(170%);
  box-shadow:
    0 4px 16px color-mix(in srgb, black 12%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 16%, transparent);
  transition: transform 0.2s var(--ww-ease-out);
}

.ww-music-cover:hover .ww-music-cover__play-glass {
  transform: scale(1.04);
}
.ww-music-cover__shadow {
  position: absolute;
  inset: -12%;
  z-index: 0;
  background-size: cover;
  background-position: center;
  filter: blur(16px);
  opacity: 0.55;
  transform: scale(1.05);
  pointer-events: none;
}
</style>
