<script setup lang="ts">
defineOptions({ name: 'PixelSidePanel' })

import { toRef } from 'vue'
import WwDockPanel, { type WwDockPanelItem } from '@shared/components/WwDockPanel.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { PixelDocument } from '@modules/library/pixel-art/domain/types'
import type { ToolOptions, ToolId } from '@modules/library/pixel-art/domain/tools'
import type { IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import type { PixelCanvasCommands } from '@modules/library/pixel-art/app/command/pixelCanvasCommands'
import { usePixelSidePanelResize } from '@modules/library/pixel-art/composables/usePixelEditorState'
import PixelPropsPanel from '@modules/library/pixel-art/components/PixelPropsPanel.vue'
import PixelLayerPanel from '@modules/library/pixel-art/components/PixelLayerPanel.vue'
import PixelPalettePanel from '@modules/library/pixel-art/components/PixelPalettePanel.vue'
import PixelDocPanel from '@modules/library/pixel-art/components/PixelDocPanel.vue'

const props = defineProps<{
  document: PixelDocument | null
  canvas: PixelCanvasCommands
  toolOptions: ToolOptions
  activeTool: ToolId
  bus?: IPixelCommandBus | null
  panelWidth?: number
  brushPreviewScale?: number
}>()

const emit = defineEmits<{
  collapse: []
  resizeWidth: [width: number]
}>()

const dockPanels: WwDockPanelItem[] = [
  { id: 'props', title: '属性', icon: 'sliders-horizontal' },
  { id: 'palette', title: '调色板', icon: 'palette' },
  { id: 'doc', title: '画布', icon: 'layout-grid' },
  { id: 'layers', title: '图层', icon: 'layers' }
]

const panelWidthRef = toRef(props, 'panelWidth')
const { startResize } = usePixelSidePanelResize((width) => emit('resizeWidth', width))

function patchToolOptions(patch: Partial<ToolOptions>) {
  props.canvas.setToolOptions(patch)
}

function setForeground(color: string) {
  props.canvas.setForeground(color)
}

function setBackground(color: string) {
  props.canvas.setBackground(color)
}

function onResizePointerDown(e: PointerEvent) {
  startResize(e, panelWidthRef.value ?? 280)
}
</script>

<template>
  <aside class="pa-side-panel pa-panel-enter">
    <div class="pa-side-panel__resize" aria-hidden="true" @pointerdown="onResizePointerDown" />

    <header class="pa-side-panel__head pa-side-panel__head--dock">
      <span class="pa-side-panel__head-title">面板</span>
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

    <WwDockPanel
      :panels="dockPanels"
      storage-key="wanwu.pixel-art.sideDock"
      class="pa-side-panel__dock"
    >
      <template #props>
        <PixelPropsPanel
          :document="document"
          :tool-options="toolOptions"
          :active-tool="activeTool"
          :brush-preview-scale="brushPreviewScale"
          @set-foreground="setForeground"
          @set-background="setBackground"
          @patch-tool-options="patchToolOptions"
        />
      </template>

      <template #layers>
        <PixelLayerPanel :document="document" :bus="bus" />
      </template>

      <template #palette>
        <PixelPalettePanel :foreground="document?.meta.foreground ?? '#000'" @pick="setForeground" />
      </template>

      <template #doc>
        <PixelDocPanel :document="document" :canvas="canvas" />
      </template>
    </WwDockPanel>
  </aside>
</template>

<style scoped>
.pa-side-panel__head--dock {
  justify-content: space-between;
}

.pa-side-panel__dock {
  flex: 1;
  min-height: 0;
}
</style>
