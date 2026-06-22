<script setup lang="ts">
defineOptions({ name: 'PixelSidePanel' })

import PixelLayerPanel from '@modules/library/pixel-art/components/PixelLayerPanel.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import type { PixelCanvasEngine } from '@modules/library/pixel-art/services/PixelCanvasEngine'
import type { ToolOptions, ToolId } from '@modules/library/pixel-art/domain/tools'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { PIXEL_PALETTE_PRESETS } from '@modules/library/pixel-art/domain/constants'

const props = defineProps<{
  document: PixelDocument | null
  engine: PixelCanvasEngine | null
  toolOptions: ToolOptions
  activeTool: ToolId
  tab: 'props' | 'layers' | 'palette' | 'doc'
  bus?: IPixelCommandBus | null
}>()

const emit = defineEmits<{
  'update:tab': [tab: 'props' | 'layers' | 'palette' | 'doc']
  change: []
}>()

const tabs = [
  { id: 'props' as const, label: '属性' },
  { id: 'layers' as const, label: '图层' },
  { id: 'palette' as const, label: '调色板' },
  { id: 'doc' as const, label: '文档' }
]

const brushShapeOptions = [
  { label: '方形', value: 'square' },
  { label: '圆形', value: 'circle' }
]

const shapeTools: ToolId[] = ['rect', 'ellipse', 'line']

function patchToolOptions(patch: Partial<ToolOptions>) {
  const tool = props.engine?.getTool()
  if (!tool || !props.engine) return
  props.engine.setTool(tool.id, patch)
  emit('change')
}

function setForeground(color: string) {
  if (props.document) props.document.meta.foreground = color
  props.engine?.setForeground(color)
  emit('change')
}

function setBackground(color: string) {
  if (props.document) props.document.meta.backgroundColor = color
  props.engine?.setBackgroundColor(color)
  emit('change')
}

function pickPalette(color: string) {
  setForeground(color)
}

function applyPalettePreset(key: keyof typeof PIXEL_PALETTE_PRESETS) {
  if (!props.document) return
  props.document.meta.palette = [...PIXEL_PALETTE_PRESETS[key]]
  emit('change')
}

function updateBrushSize(v: number | null) {
  if (v == null) return
  patchToolOptions({ brushSize: v })
}

function updateFillTolerance(v: number | null) {
  if (v == null) return
  patchToolOptions({ fillTolerance: v })
}

function setCanvasBackground(value: string) {
  if (!props.document) return
  props.document.meta.background = value === 'transparent' ? 'transparent' : value
  props.engine?.render()
  emit('change')
}
</script>

<template>
  <aside class="pixel-side-panel">
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        :class="{ active: tab === t.id }"
        @click="emit('update:tab', t.id)"
      >
        {{ t.label }}
      </button>
    </div>

    <div v-if="tab === 'props'" class="panel-body">
      <label class="field">
        <span>前景色</span>
        <WwColorInput :model-value="document?.meta.foreground ?? '#000'" @update:model-value="setForeground" />
      </label>
      <label class="field">
        <span>背景色（绘画）</span>
        <WwColorInput :model-value="document?.meta.backgroundColor ?? '#fff'" @update:model-value="setBackground" />
      </label>
      <label class="field">
        <span>笔刷大小</span>
        <WwNumberInput :model-value="toolOptions.brushSize" :min="1" :max="8" @update:model-value="updateBrushSize" />
      </label>
      <label class="field">
        <span>笔刷形状</span>
        <WwSelect
          :model-value="toolOptions.brushShape"
          :options="brushShapeOptions"
          option-label="label"
          option-value="value"
          @update:model-value="patchToolOptions({ brushShape: $event as 'square' | 'circle' })"
        />
      </label>
      <label v-if="activeTool === 'fill'" class="field">
        <span>填充容差</span>
        <WwNumberInput
          :model-value="toolOptions.fillTolerance"
          :min="0"
          :max="255"
          @update:model-value="updateFillTolerance"
        />
      </label>
      <template v-if="shapeTools.includes(activeTool)">
        <label class="field row">
          <input
            type="checkbox"
            :checked="toolOptions.shapeFilled"
            @change="patchToolOptions({ shapeFilled: ($event.target as HTMLInputElement).checked })"
          />
          <span>实心形状</span>
        </label>
      </template>
      <template v-if="activeTool === 'gradient'">
        <label class="field">
          <span>渐变终止色</span>
          <WwColorInput
            :model-value="toolOptions.gradientEndColor"
            @update:model-value="patchToolOptions({ gradientEndColor: $event })"
          />
        </label>
        <label class="field row">
          <input
            type="checkbox"
            :checked="toolOptions.gradientDither"
            @change="patchToolOptions({ gradientDither: ($event.target as HTMLInputElement).checked })"
          />
          <span>有序抖动</span>
        </label>
      </template>
    </div>

    <PixelLayerPanel
      v-else-if="tab === 'layers'"
      :document="document"
      :engine="engine"
      :bus="bus"
      @change="emit('change')"
    />

    <div v-else-if="tab === 'palette'" class="panel-body palette">
      <div class="preset-row">
        <button type="button" class="preset-btn" @click="applyPalettePreset('default')">默认</button>
        <button type="button" class="preset-btn" @click="applyPalettePreset('retro')">复古</button>
      </div>
      <button
        v-for="(color, i) in document?.meta.palette ?? []"
        :key="i"
        type="button"
        class="swatch"
        :style="{ background: color }"
        :title="color"
        @click="pickPalette(color)"
      />
    </div>

    <div v-else class="panel-body">
      <p class="meta-line">尺寸：{{ document?.meta.width }}×{{ document?.meta.height }}</p>
      <label class="field">
        <span>画布底色</span>
        <WwSelect
          :model-value="document?.meta.background === 'transparent' ? 'transparent' : 'custom'"
          :options="[
            { label: '透明', value: 'transparent' },
            { label: '自定义', value: 'custom' }
          ]"
          option-label="label"
          option-value="value"
          @update:model-value="setCanvasBackground($event === 'transparent' ? 'transparent' : '#FFFFFF')"
        />
      </label>
      <label v-if="document?.meta.background !== 'transparent'" class="field">
        <WwColorInput
          :model-value="document?.meta.background ?? '#FFFFFF'"
          @update:model-value="setCanvasBackground($event)"
        />
      </label>
      <label class="field row">
        <input
          type="checkbox"
          :checked="document?.meta.grid.visible"
          @change="engine?.setGridVisible(($event.target as HTMLInputElement).checked)"
        />
        <span>显示网格</span>
      </label>
      <label class="field row">
        <input
          type="checkbox"
          :checked="document?.meta.checkerboard.visible"
          @change="engine?.setCheckerboardVisible(($event.target as HTMLInputElement).checked)"
        />
        <span>显示棋盘格</span>
      </label>
    </div>
  </aside>
</template>

<style scoped>
.pixel-side-panel {
  border-left: 1px solid var(--ww-border);
  background: var(--ww-surface);
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tabs {
  display: flex;
  border-bottom: 1px solid var(--ww-border);
}

.tabs button {
  flex: 1;
  padding: 8px 4px;
  font-size: 12px;
  background: transparent;
  border: none;
  color: var(--ww-text-muted);
  cursor: pointer;
}

.tabs button.active {
  color: var(--ww-text);
  box-shadow: inset 0 -2px 0 var(--ww-accent);
}

.panel-body {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.field.row {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.palette {
  flex-direction: row;
  flex-wrap: wrap;
}

.preset-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.preset-btn {
  font-size: 12px;
  padding: 4px 8px;
  border: 1px solid var(--ww-border);
  border-radius: 4px;
  background: var(--ww-inset);
  cursor: pointer;
}

.swatch {
  width: 24px;
  height: 24px;
  border: 1px solid var(--ww-border);
  border-radius: 4px;
  cursor: pointer;
}

.meta-line {
  font-size: 12px;
  color: var(--ww-text-muted);
  margin: 0;
}
</style>
