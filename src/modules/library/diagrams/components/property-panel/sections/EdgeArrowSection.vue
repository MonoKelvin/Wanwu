<script setup lang="ts">
import { computed } from 'vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { DIAGRAM_ARROW_TYPES } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'

const { ctx, actions } = useDiagramPropertyContext()
const edge = computed(() => ctx.value.selectedEdge!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">箭头</p>
    <SettingsRow label="起点" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="edge.startArrowType"
        :options="DIAGRAM_ARROW_TYPES"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchEdge({ startArrowType: String($event ?? 'none') })"
      />
    </SettingsRow>
    <SettingsRow label="终点" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="edge.endArrowType"
        :options="DIAGRAM_ARROW_TYPES"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchEdge({ endArrowType: String($event ?? 'solid') })"
      />
    </SettingsRow>
  </section>
</template>
