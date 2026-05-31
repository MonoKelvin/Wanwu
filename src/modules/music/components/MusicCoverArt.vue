<script setup lang="ts">
import MusicCover from '@modules/music/components/MusicCover.vue'
import type { CoverSize } from '@shared/utils/musicCoverUrl'

defineProps<{
  src?: string
  title?: string
  size?: CoverSize
  shape?: 'square' | 'circle'
  showPlay?: boolean
}>()
</script>

<template>
  <MusicCover
    :src="src"
    :title="title"
    :size="size ?? 'card'"
    :shape="shape"
    :show-play="showPlay"
  />
</template>
