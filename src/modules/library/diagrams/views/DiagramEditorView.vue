<script setup lang="ts">
defineOptions({ name: 'DiagramEditorView' })

import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, shallowRef, toRefs, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { onBeforeRouteLeave, useRoute, useRouter, type NavigationGuardReturn } from 'vue-router'
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
import { useDiagramRecentShapes } from '@modules/library/diagrams/composables/useDiagramRecentShapes'
import { isShapeDragEvent, readShapeDragData } from '@modules/library/diagrams/lib/diagramShapeDrag'
import { provideDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'

function resolvedTheme(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

type DiagramEditorRuntimeState = {
  port: LogicFlowDiagramAdapter | null
  session: DiagramEditorSession | null
  bootstrappedDocKey: string | null
}

type BootstrapPromiseSlot = { docKey: string; promise: Promise<void> }

const WINDOW_RUNTIME_KEY = '__wanwuDiagramEditorRuntime'
const WINDOW_READY_DOC_KEY = '__wanwuDiagramEditorReadyDocKey'
const WINDOW_BOOTSTRAP_PROMISE_KEY = '__wanwuDiagramEditorBootstrapPromise'
const WINDOW_MOUNT_COUNT_KEY = '__wanwuDiagramEditorMountCount'
const WINDOW_UNMOUNT_COUNT_KEY = '__wanwuDiagramEditorUnmountCount'
const WINDOW_SETUP_GEN_KEY = '__wanwuDiagramEditorSetupGen'

function windowStore(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>
}

/** 每次 script 执行（含 HMR）更新；旧 onMounted 回调见版本不一致则跳过 */
const setupGeneration = crypto.randomUUID()
windowStore()[WINDOW_SETUP_GEN_KEY] = setupGeneration

function getReadyDocKey(): string | null {
  const v = windowStore()[WINDOW_READY_DOC_KEY]
  return typeof v === 'string' ? v : null
}

function setReadyDocKey(docKey: string | null): void {
  const w = windowStore()
  if (docKey) w[WINDOW_READY_DOC_KEY] = docKey
  else delete w[WINDOW_READY_DOC_KEY]
}

/** 跨 HMR/模块重载/重复 mount 复用画布运行时（挂 window，单页内持久） */
function editorRuntime(): DiagramEditorRuntimeState {
  const w = windowStore()
  if (!w[WINDOW_RUNTIME_KEY]) {
    w[WINDOW_RUNTIME_KEY] = {
      port: null,
      session: null,
      bootstrappedDocKey: getReadyDocKey()
    }
  }
  return w[WINDOW_RUNTIME_KEY] as DiagramEditorRuntimeState
}

const route = useRoute()
const router = useRouter()

function currentDocKey(): string {
  return `${String(route.params.fileId ?? 'new')}|${String(route.query.template ?? '')}`
}

function destroyModuleEditorRuntime(_reason: string): void {
  const rt = editorRuntime()
  rt.port?.destroy()
  rt.port = null
  rt.session = null
  rt.bootstrappedDocKey = null
  const w = windowStore()
  delete w[WINDOW_BOOTSTRAP_PROMISE_KEY]
  setReadyDocKey(null)
  // 保留 runtime 对象身份，避免 HMR/remount 拿到全新空对象
}

function isRuntimeReadyForDoc(docKey: string): boolean {
  const rt = editorRuntime()
  const readyDocKey = getReadyDocKey()
  if (readyDocKey !== docKey) return false
  if (!rt.port || !rt.session) return false
  rt.bootstrappedDocKey = docKey
  return true
}

/** window 级单例 Promise：全页只 cold bootstrap 一次，后续 mount 仅 join */
function ensureBootstrapPromise(docKey: string): Promise<void> {
  const w = windowStore()
  if (isRuntimeReadyForDoc(docKey)) return Promise.resolve()

  const slot = w[WINDOW_BOOTSTRAP_PROMISE_KEY] as BootstrapPromiseSlot | undefined
  if (slot?.docKey === docKey) {
    return slot.promise
  }

  if (slot) delete w[WINDOW_BOOTSTRAP_PROMISE_KEY]

  const promise = executeBootstrap(docKey).catch((err: unknown) => {
    delete w[WINDOW_BOOTSTRAP_PROMISE_KEY]
    throw err
  })
  w[WINDOW_BOOTSTRAP_PROMISE_KEY] = { docKey, promise }
  return promise
}

async function attachFromExistingRuntime(docKey: string, attempt = 0): Promise<boolean> {
  const rt = editorRuntime()
  if (!isRuntimeReadyForDoc(docKey)) return false

  portRef.value = rt.port
  sessionRef.value = rt.session
  editorReady.value = true
  loading.value = false
  wirePortHandlers(rt.port!, rt.session!)
  try {
    const el = await waitForCanvasEl()
    rt.port!.mount(el)
    attachCanvasObservers(rt.port!, el)
    rt.port!.setTheme(resolvedTheme())
    rt.port!.resize()
    refreshViewportZoom()
    return true
  } catch (err) {
    if (attempt < 8) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      return attachFromExistingRuntime(docKey, attempt + 1)
    }
    throw err
  }
}
const toast = useToast()
const selectionApi = provideDiagramEditorSelection(resolvedTheme())
const editorSelection = selectionApi.selection
const alignBarNodeCount = ref(0)
const alignBarAnchor = ref<DiagramAlignBarAnchor | null>(null)
const alignBarStageWidth = ref(0)
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
const editorVisible = ref(true)
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
  if (!port) {
    alignBarNodeCount.value = 0
    alignBarAnchor.value = null
    return
  }
  const liveCount = port.getSelection().selectedNodeCount
  alignBarNodeCount.value = liveCount
  if (liveCount < 2) {
    alignBarAnchor.value = null
    return
  }
  alignBarAnchor.value = port.getMultiSelectOverlayRect()
}

function applyAlignBarLayout(rect: DiagramAlignBarAnchor | null, nodeCount: number) {
  alignBarNodeCount.value = nodeCount
  alignBarAnchor.value = rect
}

let alignBarRaf = 0
function scheduleAlignBarRefresh() {
  if (alignBarRaf) cancelAnimationFrame(alignBarRaf)
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
  selectionApi.publish(port.getSelection())
  scheduleAlignBarRefresh()
}

const repo = new DiagramRepositoryIpcAdapter()
const bus = createDiagramCommandBus({
  getSession: () => sessionRef.value,
  repo
})
provideDiagramCommandBus(bus)
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

function wirePortHandlers(port: LogicFlowDiagramAdapter, session: DiagramEditorSession): void {
  port.onEditorSelectionChange((selection) => {
    selectionApi.publish(selection)
    scheduleAlignBarRefresh()
  })

  const syncViewport = useDebounceFn(() => {
    session.syncActivePageViewport()
  }, 300)

  port.onViewportChange(() => {
    void syncViewport()
    scheduleAlignBarRefresh()
  })
  port.onOverlayLayoutChange((layout) => {
    applyAlignBarLayout(layout.rect, layout.nodeCount)
  })
  port.onGraphChange(() => {
    session.markActivePageDirty()
    if (editorSelection.value.selectedNodeCount >= 2) {
      scheduleAlignBarRefresh()
    }
  })
  port.onContextMenu((detail) => {
    const selection = port.getSelection()
    canvasMenuRef.value?.show(
      detail.event,
      {
        kind: detail.kind,
        targetId: detail.targetId,
        nodeIds: detail.nodeIds.length ? detail.nodeIds : selection.selectedNodeIds,
        edgeIds: detail.edgeIds.length ? detail.edgeIds : selection.selectedEdgeIds
      },
      port.hasClipboard(),
      selection.canGroup ?? port.canGroupSelection(),
      selection.canUngroup ?? port.canUngroupSelection()
    )
  })
  selectionApi.publish(port.getSelection())
}

function attachCanvasObservers(port: LogicFlowDiagramAdapter, el: HTMLElement): void {
  if (resizeObserver) resizeObserver.disconnect()
  resizeObserver = new ResizeObserver(() => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf)
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      port.resize()
      refreshAlignBarAnchor()
    })
  })
  resizeObserver.observe(el)

  teardownZoomWheel?.()
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
}

async function executeBootstrap(docKey: string): Promise<void> {
  const rt = editorRuntime()
  if (isRuntimeReadyForDoc(docKey)) {
    return
  }

  // 仅切换文档时 teardown；bootstrap 进行中 (port 有但 key 未写入) 不得 destroy，否则并发 remount 会杀掉进行中的画布
  if (rt.bootstrappedDocKey && rt.bootstrappedDocKey !== docKey) {
    rt.port?.destroy()
    rt.port = null
    rt.session = null
    rt.bootstrappedDocKey = null
  }

  await import('@logicflow/core/lib/style/index.css')
  await import('@logicflow/extension/lib/style/index.css')
  const { LogicFlowDiagramAdapter: Adapter, ensureSnapshotPlugin, ensureMiniMapPlugin, ensureSelectionSelectPlugin } =
    await import('@modules/library/diagrams/services/LogicFlowDiagramAdapter')
  await ensureSnapshotPlugin()
  await ensureMiniMapPlugin()
  await ensureSelectionSelectPlugin()

  const port = new Adapter()
  const session = new DiagramEditorSession(port, repo)
  rt.port = port
  rt.session = session
  portRef.value = port
  sessionRef.value = session

  wirePortHandlers(port, session)

  const el = await waitForCanvasEl()
  port.mount(el)
  port.setTheme(resolvedTheme())
  attachCanvasObservers(port, el)

  port.resize()
  await openDocument()
  rt.bootstrappedDocKey = docKey
  setReadyDocKey(docKey)
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

function teardownEditorSurface() {
  editorReady.value = false
  editorVisible.value = false
  selectionApi.reset(resolvedTheme())
  alignBarNodeCount.value = 0
  alignBarAnchor.value = null
}

let editorShellMountCount = 0
let sharedRemoveLeaveGuard: (() => void) | null = null
let removeBeforeUnload: (() => void) | null = null

async function bootstrapEditorSurface(_trigger: 'mount' | 'activate'): Promise<void> {
  const w = windowStore()
  if (w[WINDOW_SETUP_GEN_KEY] !== setupGeneration) {
    return
  }
  const docKey = currentDocKey()
  const ready = isRuntimeReadyForDoc(docKey)
  if (ready) loading.value = false
  try {
    await ensureBootstrapPromise(docKey)
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
  const w = windowStore()
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
  if (isRuntimeReadyForDoc(docKey)) {
    loading.value = false
    void attachFromExistingRuntime(docKey)
    return
  }
  if (windowStore()[WINDOW_BOOTSTRAP_PROMISE_KEY]) return
  void bootstrapEditorSurface('activate')
})

watch(fileId, async (id, prev) => {
  if (!portRef.value || !sessionRef.value || id === prev) return
  // 自动/手动保存后仅更新 URL 时，会话已持有同一文件，无需重载
  if (sessionRef.value.fileId === id) return
  delete windowStore()[WINDOW_BOOTSTRAP_PROMISE_KEY]
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
    editorRuntime().bootstrappedDocKey = docKey
    setReadyDocKey(docKey)
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
  const w = windowStore()
  w[WINDOW_UNMOUNT_COUNT_KEY] = ((w[WINDOW_UNMOUNT_COUNT_KEY] as number) ?? 0) + 1
  editorShellMountCount = Math.max(0, editorShellMountCount - 1)
  teardownEditorSurface()
  unsubscribeBusResult()
  if (editorShellMountCount === 0) {
    sharedRemoveLeaveGuard?.()
    sharedRemoveLeaveGuard = null
    removeBeforeUnload?.()
  }
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  if (zoomWheelRaf) cancelAnimationFrame(zoomWheelRaf)
  if (alignBarRaf) cancelAnimationFrame(alignBarRaf)
  resizeObserver?.disconnect()
  resizeObserver = null
  teardownZoomWheel?.()
  teardownZoomWheel = null
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
        </template>
      </template>
    </div>
  </div>
</template>

<style>
@import '../styles/diagram-shared.css';
</style>
