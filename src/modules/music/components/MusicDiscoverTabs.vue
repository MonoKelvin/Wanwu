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
  <div class="ww-music-pill-tabs ww-music-discover-tabs" role="tablist" aria-label="发现分类">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      type="button"
      role="tab"
      class="ww-music-pill-tabs__btn"
      :class="{ 'is-active': active === tab.id }"
      :aria-selected="active === tab.id"
      @click="active = tab.id"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
