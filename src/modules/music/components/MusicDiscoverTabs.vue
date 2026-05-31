<script setup lang="ts">
import { computed } from 'vue'

export type DiscoverTabId = 'featured' | 'recommend' | 'new' | 'more'

const props = defineProps<{
  modelValue: DiscoverTabId
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DiscoverTabId]
}>()

const tabs: Array<{ id: DiscoverTabId; label: string }> = [
  { id: 'featured', label: '精选' },
  { id: 'recommend', label: '推荐' },
  { id: 'new', label: '新歌' },
  { id: 'more', label: '更多' }
]

const active = computed({
  get: () => props.modelValue,
  set: (v: DiscoverTabId) => emit('update:modelValue', v)
})
</script>

<template>
  <div class="ww-music-discover-tabs" role="tablist" aria-label="发现分类">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      class="ww-music-discover-tabs__btn"
      :class="{ 'is-active': active === tab.id }"
      :aria-selected="active === tab.id"
      @click="active = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.ww-music-discover-tabs {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  padding: 0.25rem;
  border-radius: 999px;
  border: 1px solid var(--ww-glass-border);
  background: color-mix(in srgb, var(--ww-inset) 85%, transparent);
}

.ww-music-discover-tabs__btn {
  padding: 0.4rem 0.95rem;
  border: none;
  border-radius: 999px;
  background: transparent;
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--ww-ink-muted);
  cursor: pointer;
  transition:
    background var(--ww-duration-fast) var(--ww-ease-out),
    color var(--ww-duration-fast) var(--ww-ease-out);
}

.ww-music-discover-tabs__btn:hover {
  color: var(--ww-ink);
}

.ww-music-discover-tabs__btn.is-active {
  background: var(--ww-content);
  color: var(--ww-ink);
  font-weight: 600;
  box-shadow: 0 1px 4px color-mix(in srgb, var(--ww-ink) 8%, transparent);
}
</style>
