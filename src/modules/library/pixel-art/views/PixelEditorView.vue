<script setup lang="ts">
defineOptions({ name: 'PixelEditorView' })

import { computed } from 'vue'
import PixelEditorToolbar from '@modules/library/pixel-art/components/PixelEditorToolbar.vue'
import PixelToolStrip from '@modules/library/pixel-art/components/PixelToolStrip.vue'
import PixelSidePanel from '@modules/library/pixel-art/components/PixelSidePanel.vue'
import PixelStatusBar from '@modules/library/pixel-art/components/PixelStatusBar.vue'
import PixelExportDialog from '@modules/library/pixel-art/components/PixelExportDialog.vue'
import { usePixelEditorState } from '@modules/library/pixel-art/composables/usePixelEditorState'
import { downloadBlob } from '@modules/library/pixel-art/lib/exportImage'

const editorState = usePixelEditorState()
const {
  canvasWrapRef,
  port,
  sessionRef,
  editorReady,
  cursor,
  activeTool,
  canUndo,
  canRedo,
  sidePanelTab,
  exportDialogOpen,
  layout,
  docTitle,
  toolLabel,
  selectTool,
  undo,
  redo,
  saveDocument,
  bus
} = editorState

const document = computed(() => sessionRef.value?.content ?? null)
const toolOptions = computed(() => port.value.getTool().options)
const layerCount = computed(() => document.value?.frames[0]?.layers.length ?? 0)

function onSideChange() {
  sessionRef.value?.syncFromPort(document.value?.meta.activeLayerId)
  port.value.render()
}

async function handleExport(options: {
  format: 'png' | 'jpeg' | 'svg'
  jpegQuality: number
  svgMode: 'raster' | 'vector'
  svgStrategy: 'merged' | 'per-pixel'
}) {
  try {
    let blob: Blob
    const ext = options.format === 'jpeg' ? 'jpg' : options.format
    if (options.format === 'png') blob = await port.value.exportMergedPng()
    else if (options.format === 'jpeg') blob = await port.value.exportMergedJpeg(options.jpegQuality)
    else blob = await port.value.exportSvg(options.svgMode, options.svgStrategy)
    downloadBlob(blob, `${docTitle.value}.${ext}`)
  } catch (err) {
    editorState.loadError.value = err instanceof Error ? err.message : String(err)
  }
}

function openExportDialog() {
  exportDialogOpen.value = true
}
</script>

<template>
  <div class="pixel-editor">
    <PixelEditorToolbar
      :title="docTitle"
      :can-undo="canUndo"
      :can-redo="canRedo"
      :dirty="!!sessionRef?.dirty"
      @save="saveDocument"
      @export="openExportDialog"
      @undo="undo"
      @redo="redo"
    />
    <div v-if="editorState.loadError" class="error">{{ editorState.loadError }}</div>
    <div class="workspace">
      <PixelToolStrip v-if="!layout.toolStripCollapsed" :active-tool="activeTool" @select="selectTool" />
      <div ref="canvasWrapRef" class="canvas-wrap" :class="{ ready: editorReady }" />
      <PixelSidePanel
        v-if="!layout.sidePanelCollapsed"
        v-model:tab="sidePanelTab"
        :style="{ width: `${layout.sidePanelWidth}px` }"
        :document="document"
        :engine="port"
        :active-tool="activeTool"
        :bus="bus"
        :tool-options="toolOptions"
        @change="onSideChange"
      />
    </div>
    <PixelStatusBar
      :width="document?.meta.width ?? 0"
      :height="document?.meta.height ?? 0"
      :zoom="port.getViewport().zoom * 100"
      :layer-count="layerCount"
      :tool-label="toolLabel"
      :cursor-x="cursor.x"
      :cursor-y="cursor.y"
      :foreground="document?.meta.foreground ?? '#000'"
    />
    <PixelExportDialog
      v-model:open="exportDialogOpen"
      :doc-width="document?.meta.width ?? 32"
      :doc-height="document?.meta.height ?? 32"
      @export="handleExport"
    />
  </div>
</template>

<style scoped>
.pixel-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--ww-bg);
}

.error {
  padding: 8px 12px;
  color: var(--ww-danger);
  font-size: 13px;
}

.workspace {
  flex: 1;
  display: flex;
  min-height: 0;
}

.canvas-wrap {
  flex: 1;
  position: relative;
  background: var(--ww-inset);
  overflow: hidden;
}

.canvas-wrap.ready {
  cursor: crosshair;
}
</style>
