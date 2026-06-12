<script setup lang="ts">
import { computed } from 'vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import {
  DIAGRAM_DASH_PRESETS,
  DIAGRAM_SHADOW_PRESETS
} from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const { ctx, actions } = useDiagramPropertySectionView()
const node = computed(() => ctx.value.selectedNode!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">外观</p>
    <SettingsRow label="填充色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="node.fill"
        :mixed="actions.isMixed('fill')"
        allow-transparent
        aria-label="填充色"
        @update:model-value="actions.patchNode({ fill: $event })"
      />
    </SettingsRow>
    <SettingsRow label="边框色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="node.stroke"
        :mixed="actions.isMixed('stroke')"
        aria-label="边框色"
        @update:model-value="actions.patchNode({ stroke: $event })"
      />
    </SettingsRow>
    <SettingsRow label="边框粗细" class="dg-settings-row--inline dg-settings-row--control">
      <WwNumberInput
        :model-value="actions.isMixed('strokeWidth') ? null : node.strokeWidth"
        :placeholder="actions.isMixed('strokeWidth') ? '多种' : undefined"
        :min="0"
        :step="0.5"
        :max-fraction-digits="1"
        size="block"
        @update:model-value="
          actions.patchNodeNumeric({
            strokeWidth: actions.parseNumber($event, node.strokeWidth, 0)
          })
        "
      />
    </SettingsRow>
    <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="actions.isMixed('strokeDasharray') ? null : (node.strokeDasharray ?? '')"
        :placeholder="actions.isMixed('strokeDasharray') ? '多种' : undefined"
        :options="DIAGRAM_DASH_PRESETS"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchNode({ strokeDasharray: String($event ?? '') })"
      />
    </SettingsRow>
    <SettingsRow label="阴影" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="actions.isMixed('shadow') ? null : node.shadow"
        :placeholder="actions.isMixed('shadow') ? '多种' : undefined"
        :options="DIAGRAM_SHADOW_PRESETS"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchNode({ shadow: String($event ?? 'none') })"
      />
    </SettingsRow>
  </section>
</template>
