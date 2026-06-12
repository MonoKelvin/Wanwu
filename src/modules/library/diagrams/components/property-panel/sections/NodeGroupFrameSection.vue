<script setup lang="ts">
import { computed } from 'vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { DIAGRAM_DASH_PRESETS } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const { ctx, actions } = useDiagramPropertySectionView()
const node = computed(() => ctx.value.selection.node!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">组合框</p>
    <p v-if="node.groupMemberCount != null" class="dg-prop-hint">
      含 {{ node.groupMemberCount }} 个图元
      <template v-if="node.groupEdgeCount"> · {{ node.groupEdgeCount }} 条连线 </template>
      。点击空白区域拖动整体；点击内部图元可单独编辑。
    </p>
    <SettingsRow label="始终显示" class="dg-settings-row--inline dg-settings-row--toggle">
      <WwToggleSwitch
        :model-value="node.groupAlwaysVisible ?? false"
        :drag-to-change="false"
        aria-label="始终显示组合框"
        @update:model-value="actions.patchGroupAlwaysVisible($event)"
      />
    </SettingsRow>
    <p v-if="!(node.groupAlwaysVisible ?? false)" class="dg-prop-hint">
      关闭时仅在悬停、选中或选中内部图元时显示边框
    </p>
    <SettingsRow label="边框色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="node.stroke"
        aria-label="组合框边框色"
        @update:model-value="actions.patchGroupStyle({ stroke: $event })"
      />
    </SettingsRow>
    <SettingsRow label="填充色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="node.fill"
        allow-transparent
        aria-label="组合框填充色"
        @update:model-value="actions.patchGroupStyle({ fill: $event })"
      />
    </SettingsRow>
    <SettingsRow label="边框粗细" class="dg-settings-row--inline dg-settings-row--control">
      <WwNumberInput
        :model-value="node.strokeWidth"
        :min="0"
        :step="0.5"
        :max-fraction-digits="1"
        size="block"
        @update:model-value="
          actions.patchGroupStyle({
            strokeWidth: actions.parseNumber($event, node.strokeWidth, 0)
          })
        "
      />
    </SettingsRow>
    <SettingsRow label="虚线" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="node.strokeDasharray ?? ''"
        :options="DIAGRAM_DASH_PRESETS"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchGroupStyle({ strokeDasharray: String($event ?? '') })"
      />
    </SettingsRow>
  </section>
</template>
