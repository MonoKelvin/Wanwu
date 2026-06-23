<script setup lang="ts">
defineOptions({ name: 'PixelEditorView' })

import { computed, onMounted } from 'vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import PixelEditorToolbar from '@modules/library/pixel-art/components/PixelEditorToolbar.vue'
import PixelToolStrip from '@modules/library/pixel-art/components/PixelToolStrip.vue'
import PixelSidePanel from '@modules/library/pixel-art/components/PixelSidePanel.vue'
import PixelExportDialog from '@modules/library/pixel-art/components/PixelExportDialog.vue'
import PixelUnsavedLeaveDialog from '@modules/library/pixel-art/components/PixelUnsavedLeaveDialog.vue'
import PixelSaveConflictDialog from '@modules/library/pixel-art/components/PixelSaveConflictDialog.vue'
import { usePixelEditorState } from '@modules/library/pixel-art/composables/usePixelEditorState'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'
import { downloadBlob } from '@modules/library/pixel-art/lib/exportImage'

const editorState = usePixelEditorState()
const store = usePixelArtStore()

onMounted(() => {
  void store.loadFolders()
  void store.loadRecent(12)
})
const {
  canvasWrapRef,
  port,
  sessionRef,
  editorReady,
  cursor,
  activeTool,
  canUndo,
  canRedo,
  exportDialogOpen,
  layout,
  viewportZoomPercent,
  docTitle,
  toolLabel,
  isDirty,
  isSaved,
  selectTool,
  undo,
  redo,
  saveDocument,
  goBack,
  conflictOpen,
  onConflictDismiss,
  onConflictReload,
  onConflictOverwrite,
  onConflictSaveAs,
  unsavedLeaveOpen,
  finishUnsavedLeave,
  promptSaveAs,
  openRecentFile,
  createNewDocument,
  toggleGrid,
  toggleCheckerboard,
  selectAll,
  clearSelectionContent,
  zoomIn,
  zoomOut,
  zoomReset,
  swapColors,
  hasSelection,
  gridVisible,
  checkerboardVisible,
  spacePanActive,
  canvasPanning,
  canvasToolCursorClass,
  canvas,
  toggleSidePanel,
  toggleToolStrip,
  setSidePanelWidth,
  zoomToFit,
  document,
  toolOptions,
  brushPreviewScale
} = editorState

const recentFiles = computed(() => store.recentFiles)

const activeLayerName = computed(() => {
  if (!document.value) return '—'
  const frame = document.value.frames[0]
  const layer = frame?.layers.find((l) => l.id === document.value?.meta.activeLayerId)
  return layer?.name ?? '—'
})

const canvasWrapClass = computed(() => ({
  ready: editorReady.value,
  [canvasToolCursorClass.value]: Boolean(canvasToolCursorClass.value)
}))

const folderName = computed(() => {
  const folderId = sessionRef.value?.fileMeta?.folderId ?? sessionRef.value?.targetFolderId
  if (!folderId) return undefined
  return store.folderById(folderId)?.name
})

const stageStyle = computed(() => ({
  '--pa-side-panel-w': layout.value.sidePanelCollapsed ? '0px' : `${layout.value.sidePanelWidth}px`
}))

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

function focusCanvasForKeys() {
  port.value.focusCanvas()
  canvasWrapRef.value?.focus({ preventScroll: true })
}
</script>

<template>
  <div class="pa-editor-root pa-fade-in flex h-full min-h-0 w-full flex-1 flex-col">
    <div class="pa-editor-stage" :style="stageStyle">
      <div
        ref="canvasWrapRef"
        class="pa-canvas-wrap"
        :class="canvasWrapClass"
        tabindex="0"
        @pointerdown="focusCanvasForKeys"
      >
        <div v-if="!editorReady && !editorState.loadError" class="pa-canvas-wrap__overlay">加载画布…</div>
        <div v-else-if="editorState.loadError" class="pa-canvas-wrap__overlay pa-canvas-wrap__overlay--error">
          {{ editorState.loadError }}
        </div>
      </div>

      <PixelEditorToolbar
        :title="docTitle"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :dirty="isDirty"
        :saved="isSaved"
        :file-id="sessionRef?.fileId ?? null"
        :folder-name="folderName"
        :booting="!editorReady"
        :has-selection="hasSelection"
        :grid-visible="gridVisible"
        :checkerboard-visible="checkerboardVisible"
        :recent-files="recentFiles"
        :zoom-percent="viewportZoomPercent"
        @save="saveDocument"
        @save-as="promptSaveAs"
        @export="openExportDialog"
        @undo="undo"
        @redo="redo"
        @zoom-fit="zoomToFit"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @zoom-reset="zoomReset"
        @back="goBack"
        @new-doc="createNewDocument"
        @open-recent="openRecentFile"
        @toggle-grid="toggleGrid"
        @toggle-checkerboard="toggleCheckerboard"
        @select-all="selectAll"
        @clear-selection="clearSelectionContent"
      />

      <div v-if="editorReady" class="pa-editor-workspace">
        <PixelToolStrip
          v-if="!layout.toolStripCollapsed"
          class="pa-tool-strip pa-float pa-float--left ww-glass-blur"
          :active-tool="activeTool"
          @select="selectTool"
        />
        <WwIconButton
          v-else
          icon="layout-panel-left"
          icon-size="sm"
          class="pa-panel-restore pa-panel-restore--left ww-glass-blur pa-panel-enter"
          ariaLabel="展开工具栏"
          compact
          v-tooltip.right="'展开工具栏'"
          @click="toggleToolStrip"
        />

        <PixelSidePanel
          v-if="!layout.sidePanelCollapsed"
          class="pa-side-panel pa-float pa-float--right ww-glass-blur"
          :style="{ width: `${layout.sidePanelWidth}px` }"
          :panel-width="layout.sidePanelWidth"
          :document="document"
          :canvas="canvas"
          :active-tool="activeTool"
          :bus="editorState.bus"
          :tool-options="toolOptions"
          :brush-preview-scale="brushPreviewScale"
          @collapse="toggleSidePanel"
          @resize-width="setSidePanelWidth"
        />
        <WwIconButton
          v-else
          icon="layout-panel-right"
          icon-size="sm"
          class="pa-panel-restore pa-panel-restore--right ww-glass-blur pa-panel-enter"
          ariaLabel="展开侧面板"
          compact
          v-tooltip.left="'展开侧面板'"
          @click="toggleSidePanel"
        />
      </div>
    </div>

    <footer class="pa-status-bar">
      <div class="pa-status-bar__group">
        <span class="pa-status-bar__item">{{ document?.meta.width ?? 0 }}×{{ document?.meta.height ?? 0 }}</span>
        <span class="pa-status-bar__sep" aria-hidden="true" />
        <span class="pa-status-bar__item pa-status-bar__item--layer">{{ activeLayerName }}</span>
      </div>
      <div class="pa-status-bar__group pa-status-bar__group--end">
        <span class="pa-status-bar__item">{{ toolLabel }}</span>
        <span class="pa-status-bar__sep" aria-hidden="true" />
        <span class="pa-status-bar__item pa-status-bar__item--mono">
          <template v-if="cursor.x >= 0">格 ({{ cursor.x }}, {{ cursor.y }})</template>
          <template v-else>(—)</template>
        </span>
        <span class="pa-status-bar__sep" aria-hidden="true" />
        <span class="pa-status-bar__colors" aria-label="当前颜色">
          <span
            class="pa-status-bar__swatch"
            :style="{ background: document?.meta.foreground ?? '#000' }"
            v-tooltip.top="'前景色'"
          />
          <span
            class="pa-status-bar__swatch"
            :style="{ background: document?.meta.backgroundColor ?? '#fff' }"
            v-tooltip.top="'背景色'"
          />
        </span>
      </div>
    </footer>

    <PixelExportDialog
      v-model:open="exportDialogOpen"
      :doc-width="document?.meta.width ?? 32"
      :doc-height="document?.meta.height ?? 32"
      @export="handleExport"
    />

    <PixelSaveConflictDialog
      v-model:open="conflictOpen"
      @dismiss="onConflictDismiss"
      @reload="onConflictReload"
      @overwrite="onConflictOverwrite"
      @save-as="onConflictSaveAs"
    />

    <PixelUnsavedLeaveDialog
      v-model:open="unsavedLeaveOpen"
      @save="finishUnsavedLeave('save')"
      @discard="finishUnsavedLeave('discard')"
      @cancel="finishUnsavedLeave('cancel')"
    />
  </div>
</template>

<style>
@import '../assets/pixel-shared.css';
</style>
