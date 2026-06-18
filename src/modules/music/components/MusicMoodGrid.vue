<script setup lang="ts">
import type { MusicMoodCategory } from '@modules/music/domain/types'
import MusicCover from '@modules/music/components/MusicCover.vue'
import WwIcon from '@shared/components/WwIcon.vue'

defineProps<{ moods: MusicMoodCategory[] }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <div class="ww-mood-grid">
    <button
      v-for="m in moods"
      :key="m.id"
      type="button"
      class="ww-music-mood-card"
      :class="{ 'ww-music-mood-card--no-cover': !m.coverUrl }"
      @click="emit('select', m.id)"
    >
      <div class="ww-music-mood-card__cover">
        <MusicCover v-if="m.coverUrl" :src="m.coverUrl" :title="m.title" size="card" />
        <div v-else class="ww-music-mood-card__placeholder">
          <WwIcon name="disc-3" size="md" />
        </div>
      </div>
      <span class="ww-music-mood-card__label ww-music-text-ellipsis">{{ m.title }}</span>
    </button>
  </div>
</template>

<style scoped>
.ww-mood-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.75rem, 1fr));
  gap: 0.85rem;
}

.ww-music-mood-card__placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    145deg,
    color-mix(in srgb, var(--ww-inset) 88%, var(--ww-surface-raised)),
    color-mix(in srgb, var(--ww-surface-hover) 70%, var(--ww-inset))
  );
  color: var(--ww-ink-faint);
}
</style>
