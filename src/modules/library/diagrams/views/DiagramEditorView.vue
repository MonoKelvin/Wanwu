<script setup lang="ts">
defineOptions({ name: 'DiagramEditorView' })

import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, toRefs, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useRoute, useRouter, type NavigationGuardReturn } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import DiagramEditorToolbar from '@modules/library/diagrams/components/DiagramEditorToolbar.vue'
import DiagramAssetPanel from '@modules/library/diagrams/components/DiagramAssetPanel.vue'
import DiagramPropertyPanel from '@modules/library/diagrams/components/DiagramPropertyPanel.vue'
import DiagramPageTabs from '@modules/library/diagrams/components/DiagramPageTabs.vue'
import DiagramAlignBar, {
  type DiagramAlignBarAnchor
} from '@modules/library/diagrams/components/DiagramAlignBar.vue'
import DiagramPanelRestoreButton from '@modules/library/diagrams/components/DiagramPanelRestoreButton.vue'
import DiagramCanvasContextMenu from '@modules/library/diagrams/components/DiagramCanvasContextMenu.vue'
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
import { isShapeDragEvent, readShapeDragData } from '@modules/library/diagrams/lib/diagramShapeDrag'
import {
  defaultCanvasSettings,
  type DiagramEditorSelection
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const selectedNodeCount = ref(0)
const selectedEdgeCount = ref(0)
const alignBarAnchor = ref<DiagramAlignBarAnchor | null>(null)
const alignBarStageWidth = ref(0)
const canUngroupSelection = ref(false)
const canGroupSelection = ref(false)
const alignBarStageHeight = ref(600)
const canvasRef = ref<HTMLElement | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const canvasMenuRef = ref<InstanceType<typeof DiagramCanvasContextMenu> | null>(null)
const sessionRef = shallowRef<DiagramEditorSession | null>(null)
const portRef = shallowRef<LogicFlowDiagramAdapter | null>(null)
const loading = ref(true)
const loadError = ref<string | null>(null)
const bootError = ref<string | null>(null)
const editorReady = ref(false)
const editorSelection = ref<DiagramEditorSelection>({
  kind: 'canvas',
  node: null,
  edge: null,
  canvas: defaultCanvasSettings(resolvedTheme()),
  selectedNodeCount: 0,
  selectedEdgeCount: 0,
  selectedNodeIds: [],
  selectedEdgeIds: [],
  mixedNodeFields: []
})
const isCanvasDragOver = ref(false)
const dropIndicator = ref<{ x: number; y: number } | null>(null)
const dropIndicatorSnapped = ref(false)
const viewportZoomPercent = ref(100)
const unsavedLeaveOpen = ref(false)
let unsavedLeaveResolve: ((choice: 'save' | 'discard' | 'cancel') => void) | null = null
let resizeObserver: ResizeObserver | null = null
let teardownZoomWheel: (() => void) | null = null
let resizeRaf = 0
let zoomWheelRaf = 0

function refreshViewportZoom() {
  const zoom = portRef.value?.getViewport().zoom ?? 1
  viewportZoomPercent.value = Math.round(zoom * 100)
}

function refreshAlignBarAnchor() {
  const port = portRef.value
  const wrap = canvasWrapRef.value
  if (wrap) {
    alignBarStageWidth.value = wrap.clientWidth
    alignBarStageHeight.value = wrap.clientHeight
  }
  if (!port || selectedNodeCount.value < 2) {
    alignBarAnchor.value = null
    return
  }
  alignBarAnchor.value = port.getMultiSelectOverlayRect()
}

let alignBarRaf = 0
function scheduleAlignBarRefresh() {
  if (alignBarRaf) return
  alignBarRaf = requestAnimationFrame(() => {
    alignBarRaf = 0
    refreshAlignBarAnchor()
  })
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
  editorSelection.value = port.getSelection()
  selectedNodeCount.value = editorSelection.value.selectedNodeCount
  selectedEdgeCount.value = editorSelection.value.selectedEdgeCount
  canUngroupSelection.value = port.canUngroupSelection()
  canGroupSelection.value = port.canGroupSelection()
  scheduleAlignBarRefresh()
}

const repo = new DiagramRepositoryIpcAdapter()
const bus = createDiagramCommandBus({
  getSession: () => sessionRef.value,
  repo
})
provideDiagramCommandBus(bus)
const editorLayout = provideDiagramEditorLayout()
const saveFlow = provideDiagramSaveFlow(bus, toast)

const stageStyle = computed(() => ({
  '--dg-asset-panel-w': editorLayout.assetCollapsed.value ? '0px' : '10.5rem',
  '--dg-panel-w': editorLayout.propsCollapsed.value ? '0px' : '13.5rem'
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

function applyFolderIdFromRoute() {
  const raw = route.query.folderId
  if (typeof raw !== 'string' || !raw) return
  if (raw === DG_HOME || raw === DG_RECYCLE) return
  pickedFolderId.value = raw
}

const unsubscribeBusResult = bus.onResult((cmd, result) => {
  if (!result.ok) return

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
      editorSelection.value = portRef.value.getSelection()
    }
  }
})

const fileId = computed(() => route.params.fileId as string)
const templateQuery = computed(() => route.query.template as string | undefined)
const isNewDraft = computed(() => fileId.value === 'new' || fileId.value === 'draft')

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

function resolvedTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function focusCanvasForKeys() {
  portRef.value?.focusCanvas()
  canvasWrapRef.value?.focus({ preventScroll: true })
}

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function waitForCanvasEl(): Promise<HTMLElement> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    await nextTick()
    await waitForLayout()
    const el = canvasRef.value
    if (el && el.clientWidth > 0 && el.clientHeight > 0) return el
  }
  const el = canvasRef.value
  if (el) return el
  throw new Error('画布容器未就绪')
}

async function applyFitView() {
  await waitForLayout()
  portRef.value?.resize()
  await bus.dispatch({ type: 'canvas.zoomToFit' })
  refreshViewportZoom()
}

async function applyCenterContentView(resetZoom: boolean) {
  await waitForLayout()
  portRef.value?.resize()
  if (resetZoom) {
    portRef.value?.zoomReset()
  } else {
    const zoom = sessionRef.value?.getActivePage()?.viewport?.zoom ?? 1
    if (Math.abs(zoom - 1) > 0.001) {
      portRef.value?.zoom(undefined, zoom)
    } else {
      portRef.value?.zoomReset()
    }
  }
  portRef.value?.centerContent()
  sessionRef.value?.syncActivePageViewport()
  refreshViewportZoom()
}

async function openDocument() {
  loadError.value = null
  if (isNewDraft.value) applyFolderIdFromRoute()
  const wantFitView = route.query.fitView === '1'
  const payload: Record<string, string | boolean> = { skipViewport: true }
  if (!isNewDraft.value) {
    payload.fileId = fileId.value
  } else if (templateQuery.value) {
    payload.templateId = templateQuery.value
  }
  const result = await bus.dispatch({ type: 'document.open', payload })
  if (!result.ok) {
    loadError.value = result.message ?? '无法打开文档'
    toast.add({
      severity: 'error',
      summary: '打开失败',
      detail: loadError.value,
      life: 5000
    })
    if (sessionRef.value && !sessionRef.value.content) {
      sessionRef.value.openBlank()
    }
    return
  }
  portRef.value?.resize()
  if (wantFitView) {
    await applyFitView()
    sessionRef.value?.flushActivePage()
    const nextQuery = { ...route.query }
    delete nextQuery.fitView
    void router.replace({ query: nextQuery })
  } else {
    await applyCenterContentView(isNewDraft.value)
  }
}

async function bootstrapEditor() {
  await import('@logicflow/core/lib/style/index.css')
  await import('@logicflow/extension/lib/style/index.css')
  const { LogicFlowDiagramAdapter: Adapter, ensureSnapshotPlugin, ensureMiniMapPlugin, ensureSelectionSelectPlugin } = await import(
    '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
  )
  await ensureSnapshotPlugin()
  await ensureMiniMapPlugin()
  await ensureSelectionSelectPlugin()

  const port = new Adapter()
  const session = new DiagramEditorSession(port, repo)
  sessionRef.value = session
  portRef.value = port

  // 等 AppShell 侧栏等 async 子树卸载完成，避免与 nextTick 同帧触发 ref 空引用
  const el = await waitForCanvasEl()

  port.mount(el)
  port.setTheme(resolvedTheme())
  port.onEditorSelectionChange((selection) => {
    editorSelection.value = selection
    selectedNodeCount.value = selection.selectedNodeCount
    selectedEdgeCount.value = selection.selectedEdgeCount
    canUngroupSelection.value = port.canUngroupSelection()
    canGroupSelection.value = port.canGroupSelection()
    refreshAlignBarAnchor()
  })
  const syncViewport = useDebounceFn(() => {
    sessionRef.value?.syncActivePageViewport()
  }, 300)

  port.onViewportChange(() => {
    void syncViewport()
    scheduleAlignBarRefresh()
  })
  port.onOverlayLayoutChange(() => {
    scheduleAlignBarRefresh()
  })
  port.onGraphChange(() => {
    sessionRef.value?.markActivePageDirty()
    if (selectedNodeCount.value >= 2) {
      scheduleAlignBarRefresh()
    }
  })
  port.onContextMenu((detail) => {
    canvasMenuRef.value?.show(
      detail.event,
      {
        kind: detail.kind,
        targetId: detail.targetId,
        nodeIds: detail.nodeIds,
        edgeIds: detail.edgeIds
      },
      port.hasClipboard(),
      port.canGroupSelection(),
      port.canUngroupSelection()
    )
  })
  editorSelection.value = port.getSelection()

  resizeObserver = new ResizeObserver(() => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      port.resize()
      refreshAlignBarAnchor()
    })
  })
  resizeObserver.observe(el)

  const onZoomWheel = () => {
    if (zoomWheelRaf) return
    zoomWheelRaf = requestAnimationFrame(() => {
      zoomWheelRaf = 0
      refreshViewportZoom()
      refreshAlignBarAnchor()
    })
  }
  el.addEventListener('wheel', onZoomWheel, { passive: true })
  teardownZoomWheel = () => el.removeEventListener('wheel', onZoomWheel)

  port.resize()
  await openDocument()
  editorReady.value = true
  refreshViewportZoom()
  await waitForLayout()
  port.resize()
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

let removeLeaveGuard: (() => void) | null = null
let removeBeforeUnload: (() => void) | null = null

onMounted(() => {
  removeLeaveGuard = router.beforeEach(async (to, from) => {
    if (!isDiagramEditorPath(from.path) || isDiagramEditorPath(to.path)) return true
    return flushBeforeLeave()
  })

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
  }

  void (async () => {
    try {
      await bootstrapEditor()
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
  })()
})

watch(fileId, async (id, prev) => {
  if (!portRef.value || !sessionRef.value || id === prev) return
  // 自动/手动保存后仅更新 URL 时，会话已持有同一文件，无需重载
  if (sessionRef.value.fileId === id) return
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
    if (portRef.value) editorSelection.value = portRef.value.getSelection()
  }
)

onBeforeUnmount(() => {
  editorReady.value = false
  unsubscribeBusResult()
  removeLeaveGuard?.()
  removeLeaveGuard = null
  removeBeforeUnload?.()
  removeBeforeUnload = null
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  if (zoomWheelRaf) cancelAnimationFrame(zoomWheelRaf)
  if (alignBarRaf) cancelAnimationFrame(alignBarRaf)
  resizeObserver?.disconnect()
  resizeObserver = null
  teardownZoomWheel?.()
  teardownZoomWheel = null
  portRef.value?.destroy()
  sessionRef.value = null
  portRef.value = null
})

async function goBack() {
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
      <div
        ref="canvasWrapRef"
        class="dg-canvas-wrap"
        tabindex="0"
        :class="{ 'dg-canvas-wrap--drop-target': isCanvasDragOver }"
        @pointerdown="focusCanvasForKeys"
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
        <div v-if="loading" class="dg-canvas-wrap__overlay">加载画布…</div>
        <div v-else-if="loadError" class="dg-canvas-wrap__overlay dg-canvas-wrap__overlay--error">
          {{ loadError }}
        </div>
      </div>

      <DiagramEditorToolbar
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
        <DiagramAlignBar
          :node-count="selectedNodeCount"
          :anchor-rect="alignBarAnchor"
          :stage-width="alignBarStageWidth"
          :stage-height="alignBarStageHeight"
          :can-group="canGroupSelection"
          :can-ungroup="canUngroupSelection"
        />
        <DiagramAssetPanel v-if="!editorLayout.assetCollapsed.value" />
        <DiagramPanelRestoreButton
          v-else
          side="left"
          icon="layout-grid"
          label="展开图元面板"
          @click="toggleAssetPanelCollapsed(editorLayout)"
        />
        <DiagramPropertyPanel
          v-if="!editorLayout.propsCollapsed.value"
          :selection="editorSelection"
          :file-id="sessionRef?.fileId ?? null"
          :can-ungroup="canUngroupSelection"
          :can-group="canGroupSelection"
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
      </template>
    </div>
  </div>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
