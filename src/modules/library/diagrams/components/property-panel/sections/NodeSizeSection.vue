<script setup lang="ts">
import { computed } from 'vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const { ctx, actions } = useDiagramPropertySectionView()
const node = computed(() => ctx.value.selectedNode!)
const topLeft = computed(() => actions.nodeTopLeft(node.value))
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">位置与尺寸</p>
    <div class="dg-prop-kv-grid dg-prop-kv-grid--metrics">
      <SettingsRow label="X" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="topLeft.left"
          :max-fraction-digits="0"
          size="block"
          @update:model-value="
            actions.patchNodeLeft(actions.parseNumber($event, topLeft.left))
          "
        />
      </SettingsRow>
      <SettingsRow label="Y" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="topLeft.top"
          :max-fraction-digits="0"
          size="block"
          @update:model-value="
            actions.patchNodeTop(actions.parseNumber($event, topLeft.top))
          "
        />
      </SettingsRow>
      <SettingsRow label="宽" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="node.width"
          :min="1"
          :max-fraction-digits="0"
          size="block"
          @update:model-value="
            actions.patchNodeWidth(actions.parseNumber($event, node.width, 1))
          "
        />
      </SettingsRow>
      <SettingsRow label="高" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="node.height"
          :min="1"
          :max-fraction-digits="0"
          size="block"
          @update:model-value="
            actions.patchNodeHeight(actions.parseNumber($event, node.height, 1))
          "
        />
      </SettingsRow>
    </div>
  </section>
</template>
