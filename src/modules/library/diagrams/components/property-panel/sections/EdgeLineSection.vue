<script setup lang="ts">
import { computed } from 'vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import {
  DIAGRAM_DASH_PRESETS,
  DIAGRAM_EDGE_TYPES
} from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const { ctx, actions } = useDiagramPropertySectionView()
const edge = computed(() => ctx.value.selectedEdge!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">线条</p>
    <SettingsRow label="线型" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="edge.type"
        :options="DIAGRAM_EDGE_TYPES"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchEdge({ type: String($event ?? 'polyline') })"
      />
    </SettingsRow>
    <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="edge.strokeDasharray"
        :options="DIAGRAM_DASH_PRESETS"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchEdge({ strokeDasharray: String($event ?? '') })"
      />
    </SettingsRow>
    <SettingsRow label="颜色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="edge.stroke"
        aria-label="线条颜色"
        @update:model-value="actions.patchEdge({ stroke: $event })"
      />
    </SettingsRow>
    <SettingsRow label="粗细" class="dg-settings-row--inline dg-settings-row--control">
      <WwNumberInput
        :model-value="edge.strokeWidth"
        :min="0"
        :step="0.5"
        :max-fraction-digits="1"
        size="block"
        @update:model-value="
          actions.dispatchEdgeNumeric({
            strokeWidth: actions.parseNumber($event, edge.strokeWidth, 0)
          })
        "
      />
    </SettingsRow>
  </section>
</template>
