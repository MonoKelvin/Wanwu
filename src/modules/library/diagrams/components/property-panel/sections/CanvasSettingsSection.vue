<script setup lang="ts">
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import { DIAGRAM_THEME_PRESETS } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'

const { canvas, actions } = useDiagramPropertyContext()
</script>

<template>
  <section class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">画布</p>
    <SettingsRow label="显示网格" class="dg-settings-row--inline">
      <WwToggleSwitch
        :model-value="canvas.gridVisible"
        :drag-to-change="false"
        aria-label="显示网格"
        @update:model-value="actions.patchCanvas({ gridVisible: $event })"
      />
    </SettingsRow>
    <SettingsRow label="吸附网格" class="dg-settings-row--inline">
      <WwToggleSwitch
        :model-value="canvas.snapGrid"
        :drag-to-change="false"
        aria-label="吸附网格"
        @update:model-value="actions.patchCanvas({ snapGrid: $event })"
      />
    </SettingsRow>
    <p v-if="canvas.snapGrid" class="dg-prop-hint">
      拖动时显示对齐线，接近网格时轻吸附，松手后对齐网格
    </p>
    <SettingsRow label="导航窗口" class="dg-settings-row--inline">
      <WwToggleSwitch
        :model-value="canvas.miniMapVisible"
        :drag-to-change="false"
        aria-label="显示导航窗口"
        @update:model-value="actions.patchCanvas({ miniMapVisible: $event })"
      />
    </SettingsRow>
    <SettingsRow label="背景色" class="dg-settings-row--inline dg-settings-row--control">
      <WwColorInput
        :model-value="canvas.backgroundColor"
        aria-label="背景色"
        @update:model-value="actions.patchCanvas({ backgroundColor: $event })"
      />
    </SettingsRow>
    <SettingsRow label="主题配色" class="dg-settings-row--inline dg-settings-row--control">
      <WwSelect
        :model-value="canvas.themePreset"
        :options="DIAGRAM_THEME_PRESETS"
        option-label="label"
        option-value="value"
        size="block"
        @update:model-value="actions.patchCanvas({ themePreset: String($event ?? 'default') })"
      />
    </SettingsRow>
  </section>
</template>
