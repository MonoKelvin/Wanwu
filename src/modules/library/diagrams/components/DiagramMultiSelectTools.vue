<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import { useDiagramCanvasCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'

const canvas = useDiagramCanvasCommands()
const selection = useDiagramEditorSelection().selection

const nodeCount = computed(() => effectiveNodeCount(selection.value))
const edgeCount = computed(() => effectiveEdgeCount(selection.value))
const canGroup = computed(() => selection.value.canGroup ?? false)
const canUngroup = computed(() => selection.value.canUngroup ?? false)
const isGroupFrameOnly = computed(
  () =>
    nodeCount.value === 1 &&
    edgeCount.value === 0 &&
    selection.value.node?.type === DIAGRAM_GROUP_FRAME_TYPE
)

const showSection = computed(
  () => nodeCount.value + edgeCount.value > 1 || canGroup.value || canUngroup.value
)

const showGroupButton = computed(() => {
  if (isGroupFrameOnly.value) return false
  return canGroup.value || nodeCount.value + edgeCount.value >= 2
})

const groupEnabled = computed(() => showGroupButton.value)
const ungroupEnabled = computed(() => canUngroup.value)

function group() {
  if (!groupEnabled.value) return
  canvas.group()
}

function ungroup() {
  if (!ungroupEnabled.value) return
  canvas.ungroup()
}
</script>

<template>
  <section v-if="showSection" class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">组合</p>
    <div class="dg-prop-action-row">
      <button
        v-if="showGroupButton"
        type="button"
        class="dg-prop-action-btn"
        :disabled="!groupEnabled"
        aria-label="组合"
        @click="group"
      >
        <WwIcon name="layers" size="sm" class="dg-prop-action-btn__icon" aria-hidden="true" />
        <span class="dg-prop-action-btn__label">组合</span>
      </button>
      <button
        type="button"
        class="dg-prop-action-btn"
        :disabled="!ungroupEnabled"
        aria-label="取消组合"
        @click="ungroup"
      >
        <WwIcon name="ungroup" size="sm" class="dg-prop-action-btn__icon" aria-hidden="true" />
        <span class="dg-prop-action-btn__label">取消组合</span>
      </button>
    </div>
  </section>
</template>
