<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'
import { LEISURE_READ_TAB_LABELS } from '@modules/library/leisure-read/domain/settings'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

const tabs: LeisureReadTabId[] = ['quote', 'joke', 'riddle', 'article']

const TAB_ICONS: Record<LeisureReadTabId, WwIconName> = {
  quote: 'sparkles',
  joke: 'thumbs-up',
  riddle: 'circle-help',
  article: 'book-open'
}

const model = defineModel<LeisureReadTabId>({ required: true })

const listRef = ref<HTMLElement | null>(null)
const indicator = ref({ width: 0, x: 0 })

function updateIndicator() {
  const list = listRef.value
  if (!list) return
  const active = list.querySelector<HTMLElement>(`[data-tab="${model.value}"]`)
  if (!active) return
  const listRect = list.getBoundingClientRect()
  const tabRect = active.getBoundingClientRect()
  indicator.value = {
    width: tabRect.width,
    x: tabRect.left - listRect.left
  }
}

function onSelect(tab: LeisureReadTabId) {
  if (tab === model.value) return
  model.value = tab
}

onMounted(() => {
  void nextTick(updateIndicator)
  window.addEventListener('resize', updateIndicator)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateIndicator)
})

watch(model, () => {
  void nextTick(updateIndicator)
})
</script>

<template>
  <nav class="lr-tabs-wrap" aria-label="闲读分类导航">
    <div ref="listRef" class="lr-tabs" role="tablist">
    <span
      class="lr-tabs__indicator"
      aria-hidden="true"
      :style="{
        width: `${indicator.width}px`,
        transform: `translateX(${indicator.x}px)`
      }"
    />
    <button
      v-for="tab in tabs"
      :key="tab"
      type="button"
      role="tab"
      class="lr-tabs__item"
      :class="{ 'is-active': model === tab }"
      :data-tab="tab"
      :aria-selected="model === tab"
      @click="onSelect(tab)"
    >
      <WwIcon :name="TAB_ICONS[tab]" size="xs" />
      <span class="lr-tabs__label">{{ LEISURE_READ_TAB_LABELS[tab] }}</span>
    </button>
    </div>
  </nav>
</template>
