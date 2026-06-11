<script setup lang="ts">
import { computed } from 'vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'

const { ctx, actions } = useDiagramPropertyContext()
const node = computed(() => ctx.value.selectedNode!)
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">位置与尺寸</p>
    <div class="dg-prop-kv-grid dg-prop-kv-grid--metrics">
      <SettingsRow label="X" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="actions.nodeTopLeft(node).left"
          size="block"
          @update:model-value="
            actions.patchNodePositionFromTopLeft(
              actions.parseNumber($event, actions.nodeTopLeft(node).left),
              actions.nodeTopLeft(node).top
            )
          "
        />
      </SettingsRow>
      <SettingsRow label="Y" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="actions.nodeTopLeft(node).top"
          size="block"
          @update:model-value="
            actions.patchNodePositionFromTopLeft(
              actions.nodeTopLeft(node).left,
              actions.parseNumber($event, actions.nodeTopLeft(node).top)
            )
          "
        />
      </SettingsRow>
      <SettingsRow label="宽" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="node.width"
          :min="1"
          size="block"
          @update:model-value="
            actions.patchNodeSizeKeepTopLeft(
              actions.parseNumber($event, node.width, 1),
              node.height
            )
          "
        />
      </SettingsRow>
      <SettingsRow label="高" class="dg-settings-row--stacked dg-settings-row--compact">
        <WwNumberInput
          :model-value="node.height"
          :min="1"
          size="block"
          @update:model-value="
            actions.patchNodeSizeKeepTopLeft(
              node.width,
              actions.parseNumber($event, node.height, 1)
            )
          "
        />
      </SettingsRow>
    </div>
  </section>
</template>
