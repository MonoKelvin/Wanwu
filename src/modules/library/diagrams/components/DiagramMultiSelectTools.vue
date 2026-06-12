<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import { computed } from 'vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'

const bus = useDiagramCommandBus()
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
  void bus.dispatch({ type: 'canvas.group' })
}

function ungroup() {
  if (!ungroupEnabled.value) return
  void bus.dispatch({ type: 'canvas.ungroup' })
}

function onGroupPointerDown() {
  if (!groupEnabled.value) return
  group()
}

function onUngroupPointerDown() {
  if (!ungroupEnabled.value) return
  ungroup()
}
</script>

<template>
  <div v-if="showSection" class="dg-multi-tools">
    <span
      v-if="showGroupButton"
      v-tooltip.bottom="{ value: `组合 (${DG_SHORTCUT.group})`, showDelay: 400 }"
      class="dg-toolbar-tooltip-wrap"
    >
      <WwIconButton
        icon="layers"
        compact
        ariaLabel="组合"
        :disabled="!groupEnabled"
        @pointerdown.stop.prevent="onGroupPointerDown"
      />
    </span>
    <span
      v-tooltip.bottom="{ value: `取消组合 (${DG_SHORTCUT.ungroup})`, showDelay: 400 }"
      class="dg-toolbar-tooltip-wrap"
    >
      <WwIconButton
        icon="ungroup"
        compact
        ariaLabel="取消组合"
        :disabled="!ungroupEnabled"
        @pointerdown.stop.prevent="onUngroupPointerDown"
      />
    </span>
  </div>
</template>
