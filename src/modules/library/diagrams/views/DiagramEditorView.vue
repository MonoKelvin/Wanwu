<script setup lang="ts">
defineOptions({ name: 'DiagramEditorView' })

import { computed, onActivated, onBeforeUnmount, onMounted, ref, shallowRef, toRefs, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter, type NavigationGuardReturn } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DiagramEditorToolbar from '@modules/library/diagrams/components/DiagramEditorToolbar.vue'
import DiagramAssetPanel from '@modules/library/diagrams/components/DiagramAssetPanel.vue'
import DiagramPropertyPanel from '@modules/library/diagrams/components/DiagramPropertyPanel.vue'
import DiagramPageTabs from '@modules/library/diagrams/components/DiagramPageTabs.vue'
import DiagramAlignBar from '@modules/library/diagrams/components/DiagramAlignBar.vue'
import { useDiagramAlignBar } from '@modules/library/diagrams/composables/useDiagramAlignBar'
import { useDiagramPortBinding } from '@modules/library/diagrams/composables/useDiagramPortBinding'
import DiagramPanelRestoreButton from '@modules/library/diagrams/components/DiagramPanelRestoreButton.vue'
import DiagramCanvasContextMenu from '@modules/library/diagrams/components/DiagramCanvasContextMenu.vue'
import DiagramGroupFrameDeleteConfirmHost from '@modules/library/diagrams/components/DiagramGroupFrameDeleteConfirmHost.vue'
import DiagramSaveConflictDialog from '@modules/library/diagrams/components/DiagramSaveConflictDialog.vue'
import DiagramUnsavedLeaveDialog from '@modules/library/diagrams/components/DiagramUnsavedLeaveDialog.vue'
import DiagramFolderPickerDialog from '@modules/library/diagrams/components/DiagramFolderPickerDialog.vue'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { DiagramRepositoryIpcAdapter } from '@modules/library/diagrams/infrastructure/DiagramRepositoryIpcAdapter'
import { createDiagramCommandBus } from '@modules/library/diagrams/app/commandBus/createDiagramCommandBus'
import { provideDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramAutosave } from '@modules/library/diagrams/composables/useDiagramAutosave'
import { useDiagramShortcuts } from '@modules/library/diagrams/composables/useDiagramShortcuts'
import { provideDiagramCanvasClipboard } from '@modules/library/diagrams/composables/useDiagramCanvasClipboard'
import { useDiagramIpcBridge } from '@modules/library/diagrams/composables/useDiagramIpcBridge'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'
import { provideDiagramEditorGuard } from '@modules/library/diagrams/composables/useDiagramEditorGuard'
import { provideDiagramSaveFlow } from '@modules/library/diagrams/composables/useDiagramSaveFlow'
import { provideDiagramEditorLayout } from '@modules/library/diagrams/composables/useDiagramEditorLayout'
import {
  toggleAssetPanelCollapsed,
  togglePropsPanelCollapsed
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'
import { LIBRARY_DIAGRAMS_EDITOR_ROUTE, isDiagramEditorPath } from '@modules/library/diagrams/domain/diagramRoutes'
import { useDiagramRecentShapes } from '@modules/library/diagrams/composables/useDiagramRecentShapes'
import { isShapeDragEvent, readShapeDragData } from '@modules/library/diagrams/lib/diagramShapeDrag'
import { provideDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  attachDiagramEditorFromRuntime
} from '@modules/library/diagrams/composables/useDiagramEditorCanvasAttach'
import { useDiagramEditorBootstrap } from '@modules/library/diagrams/composables/useDiagramEditorBootstrap'
import {
  clearDiagramEditorBootstrapPromise,
  destroyDiagramEditorRuntime,
  diagramEditorDocKey,
  ensureDiagramEditorBootstrap,
  getDiagramEditorRuntime,
  hasDiagramEditorBootstrapInFlight,
  isDiagramEditorRuntimeReady,
  isDiagramEditorSetupCurrent,
  setDiagramEditorReadyDocKey
} from '@modules/library/diagrams/composables/useDiagramEditorRuntime'

function resolvedTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

const route = useRoute()
const router = useRouter()

function currentDocKey(): string {
  return diagramEditorDocKey(route.params.fileId, route.query.template)
}

function destroyModuleEditorRuntime(_reason: string): void {
  destroyDiagramEditorRuntime()
}

const WINDOW_MOUNT_COUNT_KEY = '__wanwuDiagramEditorMountCount'
const WINDOW_UNMOUNT_COUNT_KEY = '__wanwuDiagramEditorUnmountCount'

const toast = useToast()
const selectionApi = provideDiagramEditorSelection(resolvedTheme())
const editorSelection = selectionApi.selection
const canvasRef = ref<HTMLElement | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const canvasMenuRef = ref<InstanceType<typeof DiagramCanvasContextMenu> | null>(null)
const sessionRef = shallowRef<DiagramEditorSession | null>(null)
const portRef = shallowRef<LogicFlowDiagramAdapter | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const bootError = ref<string | null>(null)
const editorReady = ref(false)
const editorVisible = ref(true)
const isCanvasDragOver = ref(false)
const dropIndicator = ref<{ x: number; y: number } | null>(null)
const dropIndicatorSnapped = ref(false)
const viewportZoomPercent = ref(100)
const unsavedLeaveOpen = ref(false)
let unsavedLeaveResolve: ((choice: 'save' | 'discard' | 'cancel') => void) | null = null

const {
  nodeCount: alignBarNodeCount,
  anchor: alignBarAnchor,
  stageWidth: alignBarStageWidth,
  stageHeight: alignBarStageHeight,
  scheduleRefresh: scheduleAlignBarRefresh,
  applyOverlayLayout: applyAlignBarOverlayLayout,
  dispose: disposeAlignBar
} = useDiagramAlignBar(canvasWrapRef)
const portBinding = useDiagramPortBinding({
  selectionApi,
  sessionRef,
  canvasMenuRef,
  onAlignBarSchedule: () => scheduleAlignBarRefresh(portRef),
  onOverlayLayout: (layout) => applyAlignBarOverlayLayout(layout),
  onViewportZoomRefresh: () => refreshViewportZoom(),
  onGraphDirty: () => sessionRef.value?.markActivePageDirty()
})

function refreshViewportZoom() {
  const zoom = portRef.value?.getViewport().zoom ?? 1
  viewportZoomPercent.value = Math.round(zoom * 100)
}

/** shallowRef session 内部变更不会触发视图更新，页操作成功后递增 */
const sessionRevision = ref(0)
function bumpSessionView() {
  sessionRevision.value += 1
}

function syncAfterPageCommand() {
  bumpSessionView()
  refreshViewportZoom()
  const port = portRef.value
  if (!port) return
  selectionApi.publish(port.getSelection())
  scheduleAlignBarRefresh(portRef)
}

const repo = new DiagramRepositoryIpcAdapter()
const bus = createDiagramCommandBus({
  getSession: () => sessionRef.value,
  repo
})
provideDiagramCommandBus(bus)
const canvasClipboard = {
  copy() {
    portRef.value?.copy()
  },
  paste() {
    portRef.value?.paste()
  },
  hasClipboard() {
    return portRef.value?.hasClipboard() ?? false
  }
}
provideDiagramCanvasClipboard(canvasClipboard)
const editorLayout = provideDiagramEditorLayout()
const { record: recordRecentShape } = useDiagramRecentShapes()
const saveFlow = provideDiagramSaveFlow(bus, toast)

const stageStyle = computed(() => ({
  '--dg-asset-panel-w': editorLayout.assetCollapsed.value ? '0px' : '11.75rem',
  '--dg-panel-w': editorLayout.propsCollapsed.value ? '0px' : '14.5rem'
}))

const { conflictOpen, folderPickerOpen, pickedFolderId } = toRefs(saveFlow)
const {
  onConflictDismiss,
  onConflictReload,
  onConflictOverwrite,
  onConflictSaveAs,
  onFolderPicked,
  onFolderPickerCancel,
  openConflictDialog
} = saveFlow
useDiagramIpcBridge(bus)
const autosave = useDiagramAutosave({
  bus,
  session: sessionRef,
  isBlocked: () => conflictOpen.value || folderPickerOpen.value || unsavedLeaveOpen.value,
  savePayload: () => ({ folderId: pickedFolderId.value }),
  onSaveError: (detail) => {
    toast.add({ severity: 'warn', summary: '自动保存失败', detail, life: 3500 })
  },
  onConflict: () => {
    toast.add({
      severity: 'warn',
      summary: '保存冲突',
      detail: '文件已被其他位置修改，请处理冲突后再继续',
      life: 5000
    })
    openConflictDialog(sessionRef.value?.content?.meta.title)
  }
})

async function switchPageWithFlush(dispatch: () => Promise<unknown>) {
  await autosave.flush()
  await dispatch()
}

useDiagramShortcuts(bus, {
  onSave: () => {
    if (!sessionRef.value?.dirty) return
    void saveFlow.saveDocument({ folderId: pickedFolderId.value })
  },
  onSaveAs: () => saveFlow.promptSaveAs(sessionRef.value?.content?.meta.title),
  onPagePrev: () => switchPageWithFlush(() => bus.dispatch({ type: 'page.prev' })),
  onPageNext: () => switchPageWithFlush(() => bus.dispatch({ type: 'page.next' })),
  onCopy: () => canvasClipboard.copy(),
  onPaste: () => canvasClipboard.paste(),
  isActive: () => isDiagramEditorPath(route.path),
  isBlocked: () => conflictOpen.value || folderPickerOpen.value,
  canGroup: () => portRef.value?.canGroupSelection() ?? false,
  canUngroup: () => portRef.value?.canUngroupSelection() ?? false
})

const isSaving = computed(
  () => autosave.isSaving.value || saveFlow.isSaving.value
)

watch([conflictOpen, folderPickerOpen], ([conflict, folder], [prevConflict, prevFolder]) => {
  const unblocked = (prevConflict && !conflict) || (prevFolder && !folder)
  if (unblocked && sessionRef.value?.dirty) {
    autosave.scheduleSave()
  }
})

provideDiagramEditorGuard({
  flushSave: () => autosave.flush(),
  getActivePageId: () => {
    void sessionRevision.value
    return sessionRef.value?.activePageId ?? null
  }
})

function publishLiveSelection() {
  const port = portRef.value
  if (!port) return
  selectionApi.publish(port.getSelection())
}

const unsubscribeBusResult = bus.onResult((cmd, result) => {
  if (!result.ok) return

  // 组合/拆组由 LogicFlowDiagramAdapter 内部 commitSelectionForIds 推送，此处不再 publish 避免覆盖
  if (
    cmd.type === 'canvas.select' ||
    cmd.type === 'canvas.selectAll' ||
    cmd.type === 'canvas.clearSelection'
  ) {
    publishLiveSelection()
  }

  if (
    cmd.type === 'document.save' ||
    cmd.type === 'document.saveAs' ||
    cmd.type === 'document.importWfg' ||
    cmd.type === 'document.importDrawio'
  ) {
    if (cmd.type === 'document.save' || cmd.type === 'document.saveAs') {
      bumpSessionView()
    }
    const data = result.data as { meta?: { id: string } } | undefined
    const id = data?.meta?.id ?? (data as { fileId?: string } | undefined)?.fileId
    if (id && id !== fileId.value) {
      const folderId =
        typeof route.query.folderId === 'string' ? route.query.folderId : pickedFolderId.value
      const query: Record<string, string> = {}
      if (folderId && folderId !== DG_HOME && folderId !== DG_RECYCLE) {
        query.folderId = folderId
      }
      if (cmd.type === 'document.importWfg' || cmd.type === 'document.importDrawio') {
        query.fitView = '1'
      }
      void router.replace({
        name: LIBRARY_DIAGRAMS_EDITOR_ROUTE,
        params: { fileId: id },
        query
      })
    }
  }

  if (
    cmd.type === 'canvas.zoom' ||
    cmd.type === 'canvas.zoomToFit' ||
    cmd.type === 'canvas.zoomReset' ||
    cmd.type === 'canvas.centerContent' ||
    cmd.type === 'document.open' ||
    cmd.type === 'document.importWfg' ||
    cmd.type === 'document.importDrawio' ||
    cmd.type.startsWith('page.')
  ) {
    if (cmd.type.startsWith('page.')) {
      syncAfterPageCommand()
    } else {
      refreshViewportZoom()
    }
    if (
      (cmd.type === 'document.open' ||
        cmd.type === 'document.importWfg' ||
        cmd.type === 'document.importDrawio') &&
      portRef.value
    ) {
      bumpSessionView()
      selectionApi.publish(portRef.value.getSelection())
    }
  }
})

const fileId = computed(() => route.params.fileId as string)
const templateQuery = computed(() => route.query.template as string | undefined)
const isNewDraft = computed(() => fileId.value === 'new' || fileId.value === 'draft')

const editorBootstrap = useDiagramEditorBootstrap({
  bus,
  repo,
  route,
  router,
  toast,
  canvasRef,
  portRef,
  sessionRef,
  portBinding,
  loadError,
  editorReady,
  pickedFolderId,
  refreshViewportZoom,
  resolvedTheme,
  fileId,
  templateQuery,
  isNewDraft
})
const { waitForLayout, waitForCanvasEl, openDocument, executeBootstrap } = editorBootstrap

const pages = computed(() => {
  void sessionRevision.value
  const list = sessionRef.value?.content?.pages
  return list ? [...list] : []
})
const activePageId = computed(() => {
  void sessionRevision.value
  return sessionRef.value?.activePageId ?? null
})
const pageTabsKey = computed(() => {
  void sessionRevision.value
  const list = sessionRef.value?.content?.pages
  return list?.map((p) => p.id).join('|') ?? ''
})
const title = computed(() => {
  void sessionRevision.value
  return sessionRef.value?.content?.meta.title ?? '未命名流程图'
})
const dirty = computed(() => {
  void sessionRevision.value
  return sessionRef.value?.dirty ?? false
})

function focusCanvasForKeys() {
  portRef.value?.focusCanvas()
  canvasWrapRef.value?.focus({ preventScroll: true })
}

async function attachFromExistingRuntime(docKey: string): Promise<boolean> {
  return attachDiagramEditorFromRuntime(
    docKey,
    isDiagramEditorRuntimeReady,
    getDiagramEditorRuntime,
    {
      portRef,
      sessionRef,
      portBinding,
      waitForCanvasEl,
      refreshViewportZoom,
      resolvedTheme,
      editorReady,
      loading
    }
  )
}

function askUnsavedLeave(): Promise<'save' | 'discard' | 'cancel'> {
  unsavedLeaveOpen.value = true
  return new Promise((resolve) => {
    unsavedLeaveResolve = resolve
  })
}

function finishUnsavedLeave(choice: 'save' | 'discard' | 'cancel') {
  unsavedLeaveOpen.value = false
  unsavedLeaveResolve?.(choice)
  unsavedLeaveResolve = null
}

async function confirmUnsavedLeave(): Promise<boolean> {
  if (!sessionRef.value?.dirty) return true
  const choice = await askUnsavedLeave()
  if (choice === 'cancel') return false
  if (choice === 'discard') return true
  return saveFlow.saveDocument({ folderId: pickedFolderId.value })
}

async function flushBeforeLeave(): Promise<NavigationGuardReturn> {
  const session = sessionRef.value
  if (!session?.dirty) return true

  if (session.fileId) {
    await autosave.flush()
    if (!sessionRef.value?.dirty) return true
  } else {
    autosave.cancelScheduledSave()
  }

  return confirmUnsavedLeave()
}

function teardownEditorSurface() {
  editorReady.value = false
  editorVisible.value = false
  selectionApi.reset(resolvedTheme())
  alignBarAnchor.value = null
  alignBarNodeCount.value = 0
}

let editorShellMountCount = 0
let sharedRemoveLeaveGuard: (() => void) | null = null
let removeBeforeUnload: (() => void) | null = null

async function bootstrapEditorSurface(_trigger: 'mount' | 'activate'): Promise<void> {
  if (!isDiagramEditorSetupCurrent()) {
    return
  }
  const docKey = currentDocKey()
  const ready = isDiagramEditorRuntimeReady(docKey)
  if (ready) loading.value = false
  try {
    await ensureDiagramEditorBootstrap(docKey, () => executeBootstrap(docKey))
    await attachFromExistingRuntime(docKey)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (import.meta.env.DEV && err instanceof Error && err.stack) {
      console.error('[DiagramEditor] bootstrap failed:', err.stack)
    }
    bootError.value = message
    loadError.value = message
    toast.add({ severity: 'error', summary: '画布初始化失败', detail: message, life: 5000 })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  editorShellMountCount += 1
  const w = window as unknown as Record<string, unknown>
  w[WINDOW_MOUNT_COUNT_KEY] = ((w[WINDOW_MOUNT_COUNT_KEY] as number) ?? 0) + 1

  if (!sharedRemoveLeaveGuard) {
    sharedRemoveLeaveGuard = router.beforeEach(async (to, from) => {
      if (!isDiagramEditorPath(from.path) || isDiagramEditorPath(to.path)) return true
      return flushBeforeLeave()
    })
  }

  if (!removeBeforeUnload) {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (!sessionRef.value?.dirty) return
      if (sessionRef.value.fileId) void autosave.flush()
      if (!sessionRef.value?.dirty) return
      e.preventDefault()
    }
    function onPageHide() {
      if (sessionRef.value?.fileId) void autosave.flush()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide)
    removeBeforeUnload = () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
      removeBeforeUnload = null
    }
  }

  void bootstrapEditorSurface('mount')
})

onActivated(() => {
  const docKey = currentDocKey()
  if (isDiagramEditorRuntimeReady(docKey)) {
    loading.value = false
    void attachFromExistingRuntime(docKey)
    return
  }
  if (hasDiagramEditorBootstrapInFlight()) return
  void bootstrapEditorSurface('activate')
})

watch(fileId, async (id, prev) => {
  if (!portRef.value || !sessionRef.value || id === prev) return
  // 自动/手动保存后仅更新 URL 时，会话已持有同一文件，无需重载
  if (sessionRef.value.fileId === id) return
  clearDiagramEditorBootstrapPromise()
  const nav = await flushBeforeLeave()
  if (nav !== true) {
    if (prev) {
      await router.replace({ name: LIBRARY_DIAGRAMS_EDITOR_ROUTE, params: { fileId: prev } })
    }
    return
  }
  loading.value = true
  loadError.value = null
  try {
    await openDocument()
    const docKey = currentDocKey()
    getDiagramEditorRuntime().bootstrappedDocKey = docKey
    setDiagramEditorReadyDocKey(docKey)
    refreshViewportZoom()
    await waitForLayout()
    portRef.value.resize()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    loadError.value = message
  } finally {
    loading.value = false
  }
})

watch(
  () => document.documentElement.dataset.theme,
  () => {
    portRef.value?.setTheme(resolvedTheme())
    if (portRef.value) selectionApi.publish(portRef.value.getSelection())
  }
)

onBeforeRouteLeave((to) => {
  if (!isDiagramEditorPath(to.path)) {
    teardownEditorSurface()
    destroyModuleEditorRuntime('route-leave')
  }
  return true
})

onBeforeUnmount(() => {
  const w = window as unknown as Record<string, unknown>
  w[WINDOW_UNMOUNT_COUNT_KEY] = ((w[WINDOW_UNMOUNT_COUNT_KEY] as number) ?? 0) + 1
  editorShellMountCount = Math.max(0, editorShellMountCount - 1)
  teardownEditorSurface()
  unsubscribeBusResult()
  if (editorShellMountCount === 0) {
    sharedRemoveLeaveGuard?.()
    sharedRemoveLeaveGuard = null
    removeBeforeUnload?.()
  }
  disposeAlignBar()
  portBinding.dispose()
  portRef.value = null
  sessionRef.value = null
  // 离开编辑器路由时在 onBeforeRouteLeave 中 destroyModuleEditorRuntime；HMR 保留 modulePort 供复用
  // 不在 unmount 时 destroy：HMR/remount 时 route 可能短暂不一致，仅 route-leave / goBack 销毁
})

async function goBack() {
  const ok = await flushBeforeLeave()
  if (ok !== true) return
  teardownEditorSurface()
  destroyModuleEditorRuntime('go-back')
  await pushShellRoute(router, { name: 'library-diagrams-home' })
}

function updateDropIndicator(event: DragEvent) {
  const port = portRef.value
  if (!port) return
  const pos = port.dropIndicatorPosition(event.clientX, event.clientY)
  dropIndicator.value = { x: pos.x, y: pos.y }
  dropIndicatorSnapped.value = pos.snapped
  const { x, y } = port.clientToCanvas(event.clientX, event.clientY)
  port.setEdgeInsertHighlight(port.findEdgeAtCanvasPoint(x, y))
}

function resetCanvasDragState() {
  isCanvasDragOver.value = false
  dropIndicator.value = null
  dropIndicatorSnapped.value = false
  portRef.value?.setEdgeInsertHighlight(null)
}

function onCanvasDragEnter(event: DragEvent) {
  if (!isShapeDragEvent(event)) return
  isCanvasDragOver.value = true
}

function onCanvasDragOver(event: DragEvent) {
  if (!isShapeDragEvent(event)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  isCanvasDragOver.value = true
  updateDropIndicator(event)
}

function onCanvasDragLeave(event: DragEvent) {
  if (!isShapeDragEvent(event)) return
  const wrap = event.currentTarget as HTMLElement
  const related = event.relatedTarget as Node | null
  if (related && wrap.contains(related)) return
  resetCanvasDragState()
}

function onCanvasPointerUp(_event: PointerEvent) {
  // 选区推送由 LogicFlowDiagramAdapter.afterUserSelectionChange 负责
}

function onCanvasDrop(event: DragEvent) {
  const payload = readShapeDragData(event)
  const port = portRef.value
  if (!payload || !port) {
    resetCanvasDragState()
    return
  }
  event.preventDefault()
  const { x, y } = port.canvasDropPoint(event.clientX, event.clientY)
  const insertEdgeId = port.findEdgeAtCanvasPoint(x, y) ?? undefined
  resetCanvasDragState()
  recordRecentShape(payload.shapeId)
  void bus.dispatch({
    type: 'canvas.addNode',
    payload: {
      shape: payload.shapeId,
      x,
      y,
      text: payload.defaultText || undefined,
      insertEdgeId
    }
  })
}
</script>

<template>
  <div class="dg-editor-root dg-fade-in flex h-full min-h-0 w-full flex-1 flex-col">
    <div class="dg-editor-stage" :style="stageStyle">
      <template v-if="editorVisible">
        <div
          ref="canvasWrapRef"
          class="dg-canvas-wrap"
          tabindex="0"
          :class="{ 'dg-canvas-wrap--drop-target': isCanvasDragOver }"
          @pointerdown="focusCanvasForKeys"
          @pointerup="onCanvasPointerUp"
          @dragenter="onCanvasDragEnter"
          @dragover="onCanvasDragOver"
          @dragleave="onCanvasDragLeave"
          @drop="onCanvasDrop"
        >
          <div
            ref="canvasRef"
            class="dg-canvas-frame"
            :class="{ 'dg-canvas-frame--loading': loading }"
          />
          <div
            v-if="isCanvasDragOver && dropIndicator"
            class="dg-drop-indicator"
            :class="{ 'dg-drop-indicator--snapped': dropIndicatorSnapped }"
            :style="{ left: `${dropIndicator.x}px`, top: `${dropIndicator.y}px` }"
            aria-hidden="true"
          />
          <DiagramAlignBar
            v-if="editorReady"
            :node-count="alignBarNodeCount"
            :anchor-rect="alignBarAnchor"
            :stage-width="alignBarStageWidth"
            :stage-height="alignBarStageHeight"
          />
          <div v-if="loading" class="dg-canvas-wrap__overlay">加载画布…</div>
          <div v-else-if="loadError" class="dg-canvas-wrap__overlay dg-canvas-wrap__overlay--error">
            {{ loadError }}
          </div>
        </div>

        <DiagramEditorToolbar
          v-if="editorReady || loading"
          :title="editorReady ? title : loading ? '加载中…' : '流程图'"
          :dirty="editorReady && dirty"
          :saving="editorReady && isSaving"
          :zoom-percent="viewportZoomPercent"
          :folder-id="pickedFolderId"
          :file-id="sessionRef?.fileId ?? null"
          :booting="!editorReady"
          @back="goBack"
        />

        <template v-if="editorReady">
        <DiagramAssetPanel v-if="!editorLayout.assetCollapsed.value" />
        <DiagramPanelRestoreButton
          v-else
          side="left"
          icon="layout-grid"
          label="展开图形面板"
          @click="toggleAssetPanelCollapsed(editorLayout)"
        />
        <DiagramPropertyPanel
          v-if="!editorLayout.propsCollapsed.value"
          :file-id="sessionRef?.fileId ?? null"
        />
        <DiagramPanelRestoreButton
          v-else
          side="right"
          icon="sliders-horizontal"
          label="展开属性面板"
          @click="togglePropsPanelCollapsed(editorLayout)"
        />
        <DiagramPageTabs :key="pageTabsKey" :pages="pages" :active-page-id="activePageId" />
        <DiagramSaveConflictDialog
          v-model:open="conflictOpen"
          @dismiss="onConflictDismiss"
          @reload="onConflictReload"
          @overwrite="onConflictOverwrite"
          @save-as="onConflictSaveAs"
        />
        <DiagramUnsavedLeaveDialog
          v-model:open="unsavedLeaveOpen"
          @save="finishUnsavedLeave('save')"
          @discard="finishUnsavedLeave('discard')"
          @cancel="finishUnsavedLeave('cancel')"
        />
        <DiagramFolderPickerDialog
          v-model:open="folderPickerOpen"
          v-model:folder-id="pickedFolderId"
          @confirm="onFolderPicked"
          @cancel="onFolderPickerCancel"
        />
        <DiagramCanvasContextMenu ref="canvasMenuRef" />
        <DiagramGroupFrameDeleteConfirmHost />
        </template>
      </template>
    </div>
  </div>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
