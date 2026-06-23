<script setup lang="ts">
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import PixelBrushSizeControl from '@modules/library/pixel-art/components/PixelBrushSizeControl.vue'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import type { ToolId, ToolOptions } from '@modules/library/pixel-art/domain/tools'

defineProps<{
  document: PixelDocument | null
  toolOptions: ToolOptions
  activeTool: ToolId
  brushPreviewScale?: number
}>()

const emit = defineEmits<{
  setForeground: [color: string]
  setBackground: [color: string]
  patchToolOptions: [patch: Partial<ToolOptions>]
}>()

const brushShapeOptions = [
  { label: '方形', value: 'square' },
  { label: '圆形', value: 'circle' }
]

const shapeTools: ToolId[] = ['rect', 'ellipse', 'line']
</script>

<template>
  <div class="pa-props-panel">
    <WwSettingsRow label="前景色">
      <WwColorInput
        :model-value="document?.meta.foreground ?? '#000'"
        :block="false"
        aria-label="前景色"
        @update:model-value="emit('setForeground', $event)"
      />
    </WwSettingsRow>
    <WwSettingsRow label="背景色">
      <WwColorInput
        :model-value="document?.meta.backgroundColor ?? '#fff'"
        :block="false"
        aria-label="背景色"
        @update:model-value="emit('setBackground', $event)"
      />
    </WwSettingsRow>
    <WwSettingsRow label="笔刷大小">
      <PixelBrushSizeControl
        :model-value="toolOptions.brushSize"
        :shape="toolOptions.brushShape"
        :preview-scale="brushPreviewScale"
        @update:model-value="emit('patchToolOptions', { brushSize: $event })"
      />
    </WwSettingsRow>
    <WwSettingsRow label="笔刷形状">
      <WwSelect
        :model-value="toolOptions.brushShape"
        :options="brushShapeOptions"
        size="narrow"
        option-label="label"
        option-value="value"
        @update:model-value="emit('patchToolOptions', { brushShape: $event as 'square' | 'circle' })"
      />
    </WwSettingsRow>
    <WwSettingsRow v-if="activeTool === 'fill'" label="填充容差">
      <WwNumberInput
        size="compact"
        :model-value="toolOptions.fillTolerance"
        :min="0"
        :max="255"
        @update:model-value="(v) => v != null && emit('patchToolOptions', { fillTolerance: v })"
      />
    </WwSettingsRow>
    <WwSettingsRow v-if="shapeTools.includes(activeTool)" label="实心形状">
      <WwToggleSwitch
        :model-value="toolOptions.shapeFilled"
        :drag-to-change="false"
        aria-label="实心形状"
        @update:model-value="emit('patchToolOptions', { shapeFilled: $event })"
      />
    </WwSettingsRow>
    <template v-if="activeTool === 'gradient'">
      <WwSettingsRow label="终止色">
        <WwColorInput
          :model-value="toolOptions.gradientEndColor"
          :block="false"
          aria-label="渐变终止色"
          @update:model-value="emit('patchToolOptions', { gradientEndColor: $event })"
        />
      </WwSettingsRow>
      <WwSettingsRow label="有序抖动">
        <WwToggleSwitch
          :model-value="toolOptions.gradientDither"
          :drag-to-change="false"
          aria-label="有序抖动"
          @update:model-value="emit('patchToolOptions', { gradientDither: $event })"
        />
      </WwSettingsRow>
    </template>
  </div>
</template>

<style scoped>
.pa-props-panel {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: 0.375rem 0.5rem 0.5rem;
  overflow: auto;
  min-height: 0;
  flex: 1;
}

.pa-props-panel :deep(.ww-settings-row) {
  gap: 0.5rem;
  padding: 0.1875rem 0;
}

.pa-props-panel :deep(.ww-settings-row__label) {
  max-width: 38%;
}

.pa-props-panel :deep(.ww-settings-row__control) {
  justify-content: flex-end;
}

.pa-props-panel :deep(.ww-color-input__trigger) {
  width: 1.625rem;
  height: 1.125rem;
  min-height: 1.125rem;
  border-radius: 0.25rem;
}

.pa-props-panel :deep(.ww-select-trigger) {
  min-width: 4.5rem;
}
</style>
