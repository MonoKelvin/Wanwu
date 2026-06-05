<script setup lang="ts">
import type { DiagramPage } from '@shared/types/diagrams'
import WwIcon from '@shared/components/WwIcon.vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

defineProps<{
  pages: DiagramPage[]
  activePageId: string | null
}>()

const bus = useDiagramCommandBus()

function switchPage(pageId: string) {
  void bus.dispatch({ type: 'page.switch', payload: { pageId } })
}

function addPage() {
  void bus.dispatch({ type: 'page.add' })
}
</script>

<template>
  <footer class="dg-tabs-bar dg-tabs-float ww-glass-blur">
    <button
      v-for="page in pages"
      :key="page.id"
      type="button"
      class="dg-tab"
      :class="{ 'dg-tab--active': page.id === activePageId }"
      @click="switchPage(page.id)"
    >
      {{ page.name }}
    </button>
    <button type="button" class="dg-tab-add" aria-label="新增页" @click="addPage">
      <WwIcon name="plus" size="sm" />
    </button>
  </footer>
</template>
