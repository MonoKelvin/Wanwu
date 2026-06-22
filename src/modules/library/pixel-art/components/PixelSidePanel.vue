<script setup lang="ts">
defineOptions({ name: 'PixelSidePanel' })

import { computed, ref, toRef } from 'vue'
import WwButton from '@shared/components/WwButton.vue'
import WwColorInput from '@shared/components/WwColorInput.vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import WwNumberInput from '@shared/components/WwNumberInput/WwNumberInput.vue'
import WwSelect from '@shared/components/WwSelect/WwSelect.vue'
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import type { ToolOptions, ToolId } from '@modules/library/pixel-art/domain/tools'
import { PixelCmd, type IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelCanvasCommands } from '@modules/library/pixel-art/app/command/pixelCanvasCommands'
import { getActiveFrame } from '@modules/library/pixel-art/lib/blankDocument'
import { usePixelSidePanelResize } from '@modules/library/pixel-art/composables/usePixelEditorState'

const props = defineProps<{
  document: PixelDocument | null
  canvas: PixelCanvasCommands
  toolOptions: ToolOptions
  activeTool: ToolId
  tab: 'props' | 'layers' | 'palette' | 'doc'
  bus?: IPixelCommandBus | null
  panelWidth?: number
}>()

const emit = defineEmits<{
  'update:tab': [tab: 'props' | 'layers' | 'palette' | 'doc']
  collapse: []
  resizeWidth: [width: number]
}>()

const tabs = [
  { id: 'props' as const, label: '属性', icon: 'sliders-horizontal' as const },
  { id: 'layers' as const, label: '图层', icon: 'layers' as const },
  { id: 'palette' as const, label: '调色板', icon: 'palette' as const },
  { id: 'doc' as const, label: '文档', icon: 'layout-grid' as const }
]

const brushShapeOptions = [
  { label: '方形', value: 'square' },
  { label: '圆形', value: 'circle' }
]

const shapeTools: ToolId[] = ['rect', 'ellipse', 'line']

const panelWidthRef = toRef(props, 'panelWidth')
const { startResize } = usePixelSidePanelResize((width) => emit('resizeWidth', width))

const renamingId = ref<string | null>(null)
const renameValue = ref('')

const layers = computed(() => {
  if (!props.document) return []
  return getActiveFrame(props.document).layers.slice().reverse()
})

const activeTabMeta = computed(() => tabs.find((t) => t.id === props.tab) ?? tabs[0])

const gridVisible = computed(() => props.document?.meta.grid.visible ?? true)
const checkerVisible = computed(() => props.document?.meta.checkerboard.visible ?? true)

function dispatch(type: string, payload?: Record<string, unknown>) {
  if (props.bus) void props.bus.dispatch({ type, payload })
}

function patchToolOptions(patch: Partial<ToolOptions>) {
  props.canvas.setToolOptions(patch)
}

function setForeground(color: string) {
  props.canvas.setForeground(color)
}

function setBackground(color: string) {
  props.canvas.setBackground(color)
}

function pickPalette(color: string) {
  setForeground(color)
}

function applyPalettePreset(key: 'default' | 'retro') {
  props.canvas.applyPalettePreset(key)
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
  props.canvas.setCanvasBackground(value === 'transparent' ? 'transparent' : value)
}

function onResizePointerDown(e: PointerEvent) {
  startResize(e, panelWidthRef.value ?? 280)
}

function setActiveLayer(id: string) {
  dispatch(PixelCmd.Layer.SetActive, { layerId: id })
}

function toggleLayerVisible(layerId: string, visible: boolean) {
  dispatch(PixelCmd.Layer.SetVisible, { layerId, visible: !visible })
}

function toggleLayerLocked(layerId: string, locked: boolean) {
  dispatch(PixelCmd.Layer.SetLocked, { layerId, locked: !locked })
}

function addLayer() {
  dispatch(PixelCmd.Layer.Add)
}

function deleteLayer(layerId: string) {
  dispatch(PixelCmd.Layer.Delete, { layerId })
}

function mergeVisibleLayers() {
  dispatch(PixelCmd.Layer.MergeVisible)
}

function startRename(layerId: string, name: string) {
  renamingId.value = layerId
  renameValue.value = name
}

function commitRename(layerId: string) {
  const name = renameValue.value.trim()
  if (name) dispatch(PixelCmd.Layer.Rename, { layerId, name })
  renamingId.value = null
}
</script>

<template>
  <aside class="pa-side-panel pa-panel-enter">
    <div class="pa-side-panel__resize" aria-hidden="true" @pointerdown="onResizePointerDown" />

    <header class="pa-side-panel__head">
      <WwIcon :name="activeTabMeta.icon" size="sm" class="pa-side-panel__head-icon" />
      <span class="pa-side-panel__head-title">{{ activeTabMeta.label }}</span>
      <WwIconButton
        icon="chevron-right"
        icon-size="sm"
        class="pa-side-panel__collapse"
        ariaLabel="收起侧面板"
        compact
        v-tooltip.bottom="'收起侧面板'"
        @click="emit('collapse')"
      />
    </header>

    <div class="pa-side-panel__tabs" role="tablist">
      <button
        v-for="t in tabs"
        :key="t.id"
        type="button"
        role="tab"
        class="pa-side-panel__tab"
        :class="{ 'pa-side-panel__tab--active': tab === t.id }"
        :aria-selected="tab === t.id"
        v-tooltip.bottom="t.label"
        @click="emit('update:tab', t.id)"
      >
        <WwIcon :name="t.icon" size="xs" />
        <span class="pa-side-panel__tab-label">{{ t.label }}</span>
      </button>
    </div>

    <div class="pa-side-panel__body">
      <div v-if="tab === 'props'" class="pa-side-panel__section">
        <WwSettingsRow label="前景色">
          <WwColorInput :model-value="document?.meta.foreground ?? '#000'" @update:model-value="setForeground" />
        </WwSettingsRow>
        <WwSettingsRow label="背景色" subtitle="绘画用">
          <WwColorInput
            :model-value="document?.meta.backgroundColor ?? '#fff'"
            @update:model-value="setBackground"
          />
        </WwSettingsRow>
        <WwSettingsRow label="笔刷大小">
          <WwNumberInput :model-value="toolOptions.brushSize" :min="1" :max="8" @update:model-value="updateBrushSize" />
        </WwSettingsRow>
        <WwSettingsRow label="笔刷形状">
          <WwSelect
            :model-value="toolOptions.brushShape"
            :options="brushShapeOptions"
            option-label="label"
            option-value="value"
            @update:model-value="patchToolOptions({ brushShape: $event as 'square' | 'circle' })"
          />
        </WwSettingsRow>
        <WwSettingsRow v-if="activeTool === 'fill'" label="填充容差">
          <WwNumberInput
            :model-value="toolOptions.fillTolerance"
            :min="0"
            :max="255"
            @update:model-value="updateFillTolerance"
          />
        </WwSettingsRow>
        <WwSettingsRow v-if="shapeTools.includes(activeTool)" label="实心形状">
          <WwToggleSwitch
            :model-value="toolOptions.shapeFilled"
            :drag-to-change="false"
            aria-label="实心形状"
            @update:model-value="patchToolOptions({ shapeFilled: $event })"
          />
        </WwSettingsRow>
        <template v-if="activeTool === 'gradient'">
          <WwSettingsRow label="渐变终止色">
            <WwColorInput
              :model-value="toolOptions.gradientEndColor"
              @update:model-value="patchToolOptions({ gradientEndColor: $event })"
            />
          </WwSettingsRow>
          <WwSettingsRow label="有序抖动">
            <WwToggleSwitch
              :model-value="toolOptions.gradientDither"
              :drag-to-change="false"
              aria-label="有序抖动"
              @update:model-value="patchToolOptions({ gradientDither: $event })"
            />
          </WwSettingsRow>
        </template>
      </div>

      <div v-else-if="tab === 'layers'" class="pa-side-panel__section pa-side-panel__section--layers">
        <div class="pa-layer-panel__head">
          <span class="pa-layer-panel__count">{{ layers.length }} 层</span>
          <div class="pa-layer-panel__actions">
            <WwButton size="sm" variant="ghost" @click="mergeVisibleLayers">合并可见</WwButton>
            <WwIconButton icon="plus" ariaLabel="新增图层" compact v-tooltip.bottom="'新增图层'" @click="addLayer" />
          </div>
        </div>
        <ul class="pa-layer-panel__list">
          <li
            v-for="layer in layers"
            :key="layer.id"
            class="pa-layer-panel__row"
            :class="{ 'pa-layer-panel__row--active': document?.meta.activeLayerId === layer.id }"
            @click="setActiveLayer(layer.id)"
          >
            <input
              v-if="renamingId === layer.id"
              v-model="renameValue"
              class="pa-layer-panel__rename"
              @click.stop
              @keydown.enter="commitRename(layer.id)"
              @blur="commitRename(layer.id)"
            />
            <span v-else class="pa-layer-panel__name" @dblclick.stop="startRename(layer.id, layer.name)">{{
              layer.name
            }}</span>
            <div class="pa-layer-panel__row-actions" @click.stop>
              <WwIconButton
                :icon="layer.visible ? 'eye' : 'eye-off'"
                :ariaLabel="layer.visible ? '隐藏' : '显示'"
                compact
                @click="toggleLayerVisible(layer.id, layer.visible)"
              />
              <WwIconButton
                :icon="layer.locked ? 'pin' : 'pin-off'"
                :ariaLabel="layer.locked ? '解锁' : '锁定'"
                compact
                @click="toggleLayerLocked(layer.id, layer.locked)"
              />
              <WwIconButton icon="trash-2" ariaLabel="删除" compact @click="deleteLayer(layer.id)" />
            </div>
          </li>
        </ul>
      </div>

      <div v-else-if="tab === 'palette'" class="pa-side-panel__section pa-side-panel__section--palette">
        <div class="pa-palette-presets">
          <button type="button" class="pa-palette-preset-btn" @click="applyPalettePreset('default')">默认</button>
          <button type="button" class="pa-palette-preset-btn" @click="applyPalettePreset('retro')">复古</button>
        </div>
        <button
          v-for="(color, i) in document?.meta.palette ?? []"
          :key="i"
          type="button"
          class="pa-palette-swatch"
          :style="{ background: color }"
          v-tooltip.bottom="color"
          @click="pickPalette(color)"
        />
      </div>

      <div v-else class="pa-side-panel__section">
        <p class="pa-doc-meta">尺寸 {{ document?.meta.width }}×{{ document?.meta.height }} px</p>
        <WwSettingsRow label="画布底色">
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
        </WwSettingsRow>
        <WwSettingsRow v-if="document?.meta.background !== 'transparent'" label="底色">
          <WwColorInput
            :model-value="document?.meta.background ?? '#FFFFFF'"
            @update:model-value="setCanvasBackground($event)"
          />
        </WwSettingsRow>
        <WwSettingsRow label="显示网格">
          <WwToggleSwitch
            :model-value="gridVisible"
            :drag-to-change="false"
            aria-label="显示网格"
            @update:model-value="canvas.toggleGrid($event)"
          />
        </WwSettingsRow>
        <WwSettingsRow label="显示棋盘格">
          <WwToggleSwitch
            :model-value="checkerVisible"
            :drag-to-change="false"
            aria-label="显示棋盘格"
            @update:model-value="canvas.toggleCheckerboard($event)"
          />
        </WwSettingsRow>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.pa-side-panel__section :deep(.ww-settings-row) {
  gap: 0.625rem;
}

.pa-side-panel__section :deep(.ww-settings-row__label) {
  min-width: 4.75rem;
}

.pa-side-panel__section :deep(.ww-settings-row__control) {
  flex: 1;
  min-width: 0;
}
</style>
