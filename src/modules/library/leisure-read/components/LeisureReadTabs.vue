<script setup lang="ts">
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'
import { LEISURE_READ_TAB_LABELS } from '@modules/library/leisure-read/domain/settings'

const tabs: LeisureReadTabId[] = ['quote', 'joke', 'riddle', 'article']

const model = defineModel<LeisureReadTabId>({ required: true })
</script>

<template>
  <div class="lr-tabs" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab"
      type="button"
      role="tab"
      class="lr-tabs__item"
      :class="{ 'is-active': model === tab }"
      :aria-selected="model === tab"
      @click="model = tab"
    >
      {{ LEISURE_READ_TAB_LABELS[tab] }}
    </button>
  </div>
</template>

<style scoped>
.lr-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.lr-tabs__item {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid var(--ww-border-subtle, rgba(128, 128, 128, 0.25));
  background: var(--ww-surface-muted, rgba(128, 128, 128, 0.08));
  color: var(--ww-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}

.lr-tabs__item.is-active {
  background: var(--ww-accent-soft, rgba(99, 102, 241, 0.15));
  border-color: var(--ww-accent, #6366f1);
  color: var(--ww-text-primary);
}
</style>
