<script setup lang="ts">
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import {
  DIAGRAM_ARROW_TYPES,
  DIAGRAM_DASH_PRESETS,
  DIAGRAM_EDGE_TYPES
} from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'

const { canvas, actions } = useDiagramPropertyContext()
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">默认连线</p>
    <SettingsRow label="线型" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="canvas.defaultEdge.type"
        :options="DIAGRAM_EDGE_TYPES"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchDefaultEdge({ type: String($event ?? 'polyline') })"
      />
    </SettingsRow>
    <SettingsRow label="默认线条色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="canvas.defaultEdge.stroke"
        aria-label="默认线条颜色"
        @update:model-value="actions.patchDefaultEdge({ stroke: $event })"
      />
    </SettingsRow>
    <SettingsRow label="粗细" class="dg-settings-row--inline dg-settings-row--control">
      <WwNumberInput
        :model-value="canvas.defaultEdge.strokeWidth"
        :min="0"
        :step="0.5"
        :max-fraction-digits="1"
        size="block"
        @update:model-value="
          actions.patchDefaultEdge({
            strokeWidth: actions.parseNumber($event, canvas.defaultEdge.strokeWidth, 0)
          })
        "
      />
    </SettingsRow>
    <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="canvas.defaultEdge.strokeDasharray"
        :options="DIAGRAM_DASH_PRESETS"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchDefaultEdge({ strokeDasharray: String($event ?? '') })"
      />
    </SettingsRow>
    <SettingsRow label="终点箭头" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="canvas.defaultEdge.endArrowType"
        :options="DIAGRAM_ARROW_TYPES"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchDefaultEdge({ endArrowType: String($event ?? 'solid') })"
      />
    </SettingsRow>
  </section>
</template>
