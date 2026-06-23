<script setup lang="ts">
import { ref, watch } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwSettingsGroup from '@shared/components/settings/WwSettingsGroup.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_WIDTH } from '@modules/library/pixel-art/domain/meta'
import type { PixelCanvasCommands } from '@modules/library/pixel-art/app/command/pixelCanvasCommands'
import { formatMappingCaption, getPixelUnitSize } from '@modules/library/pixel-art/lib/pixelCanvasPresets'

const props = defineProps<{
  document: PixelDocument | null
  canvas: PixelCanvasCommands
}>()

const resizeWidth = ref(256)
const resizeHeight = ref(256)
const resizeAnchor = ref<'center' | 'top-left'>('center')

const resizeAnchorOptions = [
  { label: '居中', value: 'center' },
  { label: '左上', value: 'top-left' }
]

watch(
  () => [props.document?.meta.width, props.document?.meta.height],
  () => {
    if (!props.document) return
    resizeWidth.value = props.document.meta.width
    resizeHeight.value = props.document.meta.height
  },
  { immediate: true }
)

function mappingHint() {
  if (!props.document) return ''
  const unit = getPixelUnitSize(props.document.meta)
  const map = formatMappingCaption(props.document.meta.width, props.document.meta.height)
  return `${map} · 100% 时 1px = ${unit} 屏幕像素`
}

function applyCanvasResize() {
  const w = Math.max(1, Math.min(PIXEL_MAX_WIDTH, Math.floor(resizeWidth.value)))
  const h = Math.max(1, Math.min(PIXEL_MAX_HEIGHT, Math.floor(resizeHeight.value)))
  props.canvas.resizeCanvas(w, h, resizeAnchor.value)
}

function setCanvasBackground(value: string) {
  props.canvas.setCanvasBackground(value === 'transparent' ? 'transparent' : value)
}
</script>

<template>
  <div class="pa-doc-panel">
    <p class="pa-doc-panel__hint">{{ mappingHint() }}</p>

    <WwSettingsGroup label="显示">
      <WwSettingsRow label="像素映射">
        <WwNumberInput
          size="compact"
          :model-value="document ? getPixelUnitSize(document.meta) : 1"
          :min="1"
          :max="64"
          @update:model-value="(v) => v != null && canvas.setPixelUnitSize(v)"
        />
      </WwSettingsRow>
      <WwSettingsRow label="网格细分">
        <WwNumberInput
          size="compact"
          :model-value="document?.meta.grid.size ?? 1"
          :min="1"
          :max="16"
          @update:model-value="(v) => v != null && canvas.setGridSubdiv(v)"
        />
      </WwSettingsRow>
      <WwSettingsRow label="显示网格">
        <WwToggleSwitch
          :model-value="document?.meta.grid.visible ?? true"
          :drag-to-change="false"
          aria-label="显示网格"
          @update:model-value="canvas.toggleGrid($event)"
        />
      </WwSettingsRow>
      <WwSettingsRow label="棋盘格">
        <WwToggleSwitch
          :model-value="document?.meta.checkerboard.visible ?? true"
          :drag-to-change="false"
          aria-label="显示棋盘格"
          @update:model-value="canvas.toggleCheckerboard($event)"
        />
      </WwSettingsRow>
    </WwSettingsGroup>

    <WwSettingsGroup label="尺寸">
      <WwSettingsRow label="宽度">
        <WwNumberInput
          size="compact"
          :model-value="resizeWidth"
          :min="1"
          :max="PIXEL_MAX_WIDTH"
          @update:model-value="(v) => v != null && (resizeWidth = v)"
        />
      </WwSettingsRow>
      <WwSettingsRow label="高度">
        <WwNumberInput
          size="compact"
          :model-value="resizeHeight"
          :min="1"
          :max="PIXEL_MAX_HEIGHT"
          @update:model-value="(v) => v != null && (resizeHeight = v)"
        />
      </WwSettingsRow>
      <WwSettingsRow label="锚点">
        <WwSelect
          size="narrow"
          :model-value="resizeAnchor"
          :options="resizeAnchorOptions"
          option-label="label"
          option-value="value"
          @update:model-value="(v) => (resizeAnchor = v as 'center' | 'top-left')"
        />
      </WwSettingsRow>
      <div class="pa-doc-panel__action">
        <WwButton size="sm" variant="ghost" label="应用尺寸" @click="applyCanvasResize" />
      </div>
    </WwSettingsGroup>

    <WwSettingsGroup label="底色">
      <WwSettingsRow label="模式">
        <WwSelect
          size="narrow"
          :model-value="document?.meta.background === 'transparent' ? 'transparent' : 'custom'"
          :options="[
            { label: '透明', value: 'transparent' },
            { label: '自定义', value: 'custom' }
          ]"
          option-label="label"
          option-value="value"
          @update:model-value="setCanvasBackground($event === 'transparent' ? 'transparent' : '#FFFFFF')"
        />
      </WwSettingsRow>
      <WwSettingsRow v-if="document?.meta.background !== 'transparent'" label="颜色">
        <WwColorInput
          :model-value="document?.meta.background ?? '#FFFFFF'"
          :block="false"
          aria-label="画布底色"
          @update:model-value="setCanvasBackground($event)"
        />
      </WwSettingsRow>
    </WwSettingsGroup>
  </div>
</template>

<style scoped>
.pa-doc-panel {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 0.375rem 0.5rem 0.5rem;
  overflow: auto;
  min-height: 0;
  flex: 1;
}

.pa-doc-panel__hint {
  margin: 0;
  padding: 0 0.125rem;
  font-size: 0.625rem;
  line-height: 1.45;
  color: var(--ww-ink-faint);
}

.pa-doc-panel__action {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.125rem;
}

.pa-doc-panel :deep(.ww-settings-group) {
  gap: 0.125rem;
}

.pa-doc-panel :deep(.ww-settings-group__label) {
  margin-bottom: 0.125rem;
  font-size: 0.625rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}

.pa-doc-panel :deep(.ww-settings-row) {
  gap: 0.5rem;
  padding: 0.1875rem 0;
}

.pa-doc-panel :deep(.ww-settings-row__label) {
  max-width: 38%;
}

.pa-doc-panel :deep(.ww-settings-row__control) {
  justify-content: flex-end;
}

.pa-doc-panel :deep(.ww-color-input__trigger) {
  width: 1.625rem;
  height: 1.125rem;
  min-height: 1.125rem;
  border-radius: 0.25rem;
}

.pa-doc-panel :deep(.ww-select-trigger) {
  min-width: 4.5rem;
}
</style>
