<script setup lang="ts">
import WwIcon from '@shared/components/WwIcon.vue'

defineProps<{
  title: string
  refreshing?: boolean
}>()

defineEmits<{ refresh: [] }>()
</script>

<template>
  <section class="ww-music-section">
    <header class="ww-music-section__head">
      <div class="ww-music-section__title-row">
        <h2 class="ww-music-section-title">{{ title }}</h2>
        <button
          type="button"
          class="ww-music-section__refresh"
          :class="{ 'is-spinning': refreshing }"
          :disabled="refreshing"
          aria-label="刷新"
          v-tooltip.bottom="'刷新'"
          @click="$emit('refresh')"
        >
          <WwIcon name="refresh-cw" size="xs" />
        </button>
      </div>
      <slot name="action" />
    </header>
    <slot />
  </section>
</template>

<style scoped>
.ww-music-section {
  margin-bottom: var(--ww-music-section-gap);
}

.ww-music-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: var(--ww-music-section-head-gap);
}
.ww-music-section__title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.ww-music-section__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--ww-ink-faint);
  cursor: pointer;
  transition:
    color 0.18s var(--ww-ease-out),
    background 0.18s var(--ww-ease-out),
    transform 0.15s var(--ww-ease-out);
}
.ww-music-section__refresh:hover:not(:disabled) {
  color: var(--ww-ink);
  background: var(--ww-surface-hover);
  transform: scale(1.05);
}
.ww-music-section__refresh:disabled {
  cursor: default;
  opacity: 0.65;
}
.ww-music-section__refresh.is-spinning :deep(svg) {
  animation: ww-music-refresh-spin 0.85s linear infinite;
}
@keyframes ww-music-refresh-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
