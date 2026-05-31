<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'

const props = withDefaults(
  defineProps<{
    playing?: boolean
    size?: 'sm' | 'md' | 'lg'
    loading?: boolean
    disabled?: boolean
    ariaLabel?: string
  }>(),
  {
    playing: false,
    size: 'md',
    loading: false,
    disabled: false
  }
)

defineEmits<{ click: [] }>()

const iconSize = computed(() => {
  if (props.size === 'sm') return 'sm' as const
  if (props.size === 'lg') return 'lg' as const
  return 'md' as const
})

const label = computed(
  () => props.ariaLabel ?? (props.playing ? '暂停' : '播放')
)
</script>

<template>
  <button
    type="button"
    class="ww-music-glass-play-btn"
    :class="[
      `ww-music-glass-play-btn--${size}`,
      { 'is-playing': playing, 'is-loading': loading }
    ]"
    :aria-label="label"
    :disabled="loading || disabled"
    @click="$emit('click')"
  >
    <WwIcon v-if="loading" name="loader" size="sm" spin class="ww-music-glass-play-btn__icon" />
    <WwIcon
      v-else-if="playing"
      name="pause"
      filled
      :size="iconSize"
      class="ww-music-glass-play-btn__icon"
    />
    <WwIcon
      v-else
      name="play"
      filled
      :size="iconSize"
      class="ww-music-glass-play-btn__icon ww-music-glass-play-btn__icon--play"
    />
  </button>
</template>
