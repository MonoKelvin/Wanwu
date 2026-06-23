import { ref, shallowRef, onMounted, onBeforeUnmount, onActivated, watch, computed, provide, nextTick, type Ref, type InjectionKey, type ShallowRef } from 'vue'
import { useRoute, useRouter, type NavigationGuardReturn } from 'vue-router'
import { pushShellRoute } from '@app/composables/shellNavigation'
import type { TransactionManager } from '@app/transaction'
import { PixelCanvasEngine } from '@modules/library/pixel-art/services/PixelCanvasEngine'
import { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import { getPixelArtRepository } from '@modules/library/pixel-art/services/pixelArtStore'
import { PIXEL_DEFAULT_SIZE, PIXEL_AUTOSAVE_DEBOUNCE_MS, isPixelEditorPath, LIBRARY_PIXEL_ART_EDITOR_ROUTE, LIBRARY_PIXEL_ART_HOME } from '@modules/library/pixel-art/domain/meta'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'
import { TOOL_LABELS } from '@modules/library/pixel-art/domain/tools'
import { PixelCmd, createPixelCommandBus, type CreatePixelCommandBusOptions, type IPixelCommandBus } from '@modules/library/pixel-art/app/command/PixelCommandRegistry'
import { createPixelTransactionManager } from '@modules/library/pixel-art/app/createPixelTransactionManager'
import { usePixelSaveFlow } from '@modules/library/pixel-art/composables/usePixelSaveFlow'
import { usePixelShortcuts } from '@modules/library/pixel-art/composables/usePixelShortcuts'
import { createPixelCanvasCommands } from '@modules/library/pixel-art/app/command/pixelCanvasCommands'
import { getPixelUnitSize, getGridCellSize, zoomPercentFromViewport } from '@modules/library/pixel-art/lib/pixelCanvasPresets'
import type { PixelViewport } from '@modules/library/pixel-art/domain/types'
import { pixelCanvasCursorClass } from '@modules/library/pixel-art/lib/pixelToolCursors'
import { usePixelArtStore } from '@modules/library/pixel-art/services/pixelArtStore'

const LAYOUT_STORAGE_KEY = 'wanwu.pixel-art.editorLayout'

interface PixelEditorLayoutState {
  sidePanelWidth: number
  sidePanelCollapsed: boolean
  toolStripCollapsed: boolean
}

const DEFAULT_LAYOUT: PixelEditorLayoutState = {
  sidePanelWidth: 280,
  sidePanelCollapsed: false,
  toolStripCollapsed: false
}

function loadEditorLayout(): PixelEditorLayoutState {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LAYOUT }
    return { ...DEFAULT_LAYOUT, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

function usePixelEditorLayout() {
  const layout = ref<PixelEditorLayoutState>(loadEditorLayout())

  watch(
    layout,
    (v) => {
      localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(v))
    },
    { deep: true }
  )

  function toggleSidePanel() {
    layout.value.sidePanelCollapsed = !layout.value.sidePanelCollapsed
  }

  function toggleToolStrip() {
    layout.value.toolStripCollapsed = !layout.value.toolStripCollapsed
  }

  function setSidePanelWidth(width: number) {
    layout.value.sidePanelWidth = Math.max(220, Math.min(420, width))
  }

  return { layout, toggleSidePanel, toggleToolStrip, setSidePanelWidth }
}

export function usePixelSidePanelResize(onWidth: (width: number) => void) {
  let startX = 0
  let startWidth = 0
  let active = false

  function onMove(e: PointerEvent) {
    if (!active) return
    onWidth(startWidth + (startX - e.clientX))
  }

  function onUp() {
    if (!active) return
    active = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }

  function startResize(e: PointerEvent, currentWidth: Ref<number> | number) {
    e.preventDefault()
    active = true
    startX = e.clientX
    startWidth = typeof currentWidth === 'number' ? currentWidth : currentWidth.value
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  onBeforeUnmount(onUp)

  return { startResize }
}

const PIXEL_TRANSACTION_MANAGER_KEY: InjectionKey<ShallowRef<TransactionManager | null>> =
  Symbol('pixel-transaction-manager')

function providePixelTransactionManager(
  manager: TransactionManager | null
): ShallowRef<TransactionManager | null> {
  const holder = shallowRef(manager)
  provide(PIXEL_TRANSACTION_MANAGER_KEY, holder)
  return holder
}

function setPixelTransactionManager(
  holder: ShallowRef<TransactionManager | null>,
  manager: TransactionManager | null
): void {
  holder.value = manager
}

interface PixelEditorCommandSetup {
  bus: IPixelCommandBus
  transactionManager: ShallowRef<TransactionManager | null>
  bindEditorRuntime: (session: PixelEditorSession, port: PixelCanvasEngine) => void
  disposeEditorRuntime: () => void
}

function setupPixelEditorCommands(options: {
  getSession: () => PixelEditorSession | null
  getPort: () => PixelCanvasEngine | null
  repo: ReturnType<typeof getPixelArtRepository>
  activeTool: Ref<ToolId>
  onChange?: () => void
  onSave?: () => void | Promise<void>
  onSaveAs?: () => void | Promise<void>
  onExport?: (payload: Record<string, unknown>) => void | Promise<void>
  onNew?: () => void | Promise<void>
  onOpenRecent?: () => void | Promise<void>
}): PixelEditorCommandSetup {
  const transactionManager = providePixelTransactionManager(null)

  const bus = createPixelCommandBus({
    getSession: options.getSession,
    getPort: options.getPort,
    repo: options.repo,
    getTransactionManager: () => transactionManager.value,
    onChange: options.onChange,
    setActiveTool: (tool) => {
      options.activeTool.value = tool
    },
    getActiveTool: () => options.activeTool.value,
    onSave: options.onSave,
    onSaveAs: options.onSaveAs,
    onExport: options.onExport,
    onNew: options.onNew,
    onOpenRecent: options.onOpenRecent
  } satisfies CreatePixelCommandBusOptions)

  function bindEditorRuntime(session: PixelEditorSession, port: PixelCanvasEngine): void {
    const resourceKey = session.fileId ?? session.sessionId
    const manager = createPixelTransactionManager(resourceKey, port)
    setPixelTransactionManager(transactionManager, manager)
  }

  function disposeEditorRuntime(): void {
    options.getPort()?.setStrokeRecorder(null)
    transactionManager.value?.clear()
    setPixelTransactionManager(transactionManager, null)
  }

  return { bus, transactionManager, bindEditorRuntime, disposeEditorRuntime }
}

let editorShellMountCount = 0
let sharedRemoveLeaveGuard: (() => void) | null = null
let sharedRemoveBeforeUnload: (() => void) | null = null

function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

export function usePixelEditorState() {
  const route = useRoute()
  const router = useRouter()
  const repo = getPixelArtRepository()
  const canvasWrapRef = ref<HTMLElement | null>(null)
  const port = shallowRef(new PixelCanvasEngine())
  const sessionRef = shallowRef<PixelEditorSession | null>(null)
  const editorReady = ref(false)
  const loadError = ref<string | null>(null)
  const cursor = ref({ x: -1, y: -1 })
  const activeTool = ref<ToolId>('pencil')
  const sidePanelTab = ref<'props' | 'layers' | 'palette' | 'doc'>('props')
  const exportDialogOpen = ref(false)
  const spacePanActive = ref(false)
  const canvasPanning = ref(false)
  const hasSelection = ref(false)
  const viewportZoomPercent = ref(100)
  const canUndo = ref(false)
  const canRedo = ref(false)
  const uiRevision = ref(0)
  function bumpUiRevision() {
    uiRevision.value += 1
  }
  let resizeObserver: ResizeObserver | null = null
  let resizeRaf = 0
  let bootstrapSeq = 0
  let undoUnsubscribe: (() => void) | null = null
  let refreshUndoState: () => void = () => {}
  let reloadFromDiskRef: () => Promise<void> = async () => {}

  async function waitForCanvasWrap(): Promise<HTMLElement> {
    for (let attempt = 0; attempt < 12; attempt += 1) {
      await nextTick()
      await waitForLayout()
      const el = canvasWrapRef.value
      if (el && el.clientWidth > 0 && el.clientHeight > 0) return el
    }
    const el = canvasWrapRef.value
    if (el) return el
    throw new Error('画布容器未就绪')
  }

  async function refreshEditorLayout(): Promise<void> {
    await waitForLayout()
    port.value.resize()
    refreshViewportZoom()
  }

  const { layout, toggleSidePanel, toggleToolStrip, setSidePanelWidth } = usePixelEditorLayout()

  let autosaveTimer: ReturnType<typeof setTimeout> | null = null
  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = setTimeout(() => void flushSave(), PIXEL_AUTOSAVE_DEBOUNCE_MS)
  }
  async function flushSave() {
    const session = sessionRef.value
    if (!session?.dirty || !session.fileId) return
    await session.save()
  }
  function disposeAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
  }
  function cancelScheduledSave() {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    autosaveTimer = null
  }

  const fileId = computed(() => String(route.params.fileId ?? ''))
  const isNewDraft = computed(() => fileId.value.startsWith('draft-'))
  const docTitle = computed(() => sessionRef.value?.content?.meta.title ?? '未命名像素画')
  const document = computed(() => {
    uiRevision.value
    return sessionRef.value?.content ?? null
  })
  const toolOptions = computed(() => {
    uiRevision.value
    return port.value.getTool().options
  })
  const brushPreviewScale = computed(() => {
    uiRevision.value
    const doc = sessionRef.value?.content
    if (!doc) return 1
    const unit = getPixelUnitSize(doc.meta)
    const cell = getGridCellSize(doc.meta)
    return unit * port.value.getViewport().zoom * cell
  })
  const isDirty = computed(() => !!sessionRef.value?.dirty)
  const isSaved = computed(() => Boolean(sessionRef.value?.fileId) && !sessionRef.value?.dirty)
  const gridVisible = computed(() => sessionRef.value?.content?.meta.grid.visible ?? true)
  const checkerboardVisible = computed(
    () => sessionRef.value?.content?.meta.checkerboard.visible ?? true
  )

  const saveFlow = usePixelSaveFlow(sessionRef, router, {
    onError: (msg) => {
      loadError.value = msg
    },
    onReload: () => reloadFromDiskRef()
  })

  const unsavedLeaveOpen = ref(false)
  let unsavedLeaveResolve: ((choice: 'save' | 'discard' | 'cancel') => void) | null = null

  async function saveDocument() {
    await saveFlow.saveDocument()
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
    cancelScheduledSave()
    const choice = await askUnsavedLeave()
    if (choice === 'cancel') return false
    if (choice === 'discard') {
      sessionRef.value?.clearDirty()
      return true
    }
    const result = await saveFlow.saveDocument()
    if (result === 'ok') return true
    return false
  }

  async function flushBeforeLeave(): Promise<NavigationGuardReturn> {
    const session = sessionRef.value
    if (!session?.dirty) return true
    cancelScheduledSave()
    return confirmUnsavedLeave()
  }

  async function goBack() {
    const ok = await flushBeforeLeave()
    if (ok !== true) return
    await pushShellRoute(router, { name: LIBRARY_PIXEL_ART_HOME })
  }

  async function createNewDocument() {
    const ok = await flushBeforeLeave()
    if (ok !== true) return
    await openBlankEditor(router)
  }

  async function openRecentFile(targetFileId: string) {
    if (sessionRef.value?.dirty) {
      const ok = await flushBeforeLeave()
      if (ok !== true) return
    }
    await pushShellRoute(router, {
      name: LIBRARY_PIXEL_ART_EDITOR_ROUTE,
      params: { fileId: targetFileId }
    })
  }

  async function openMostRecentFile() {
    const store = usePixelArtStore()
    if (!store.recentFiles.length) await store.loadRecent(12)
    const first = store.recentFiles[0]
    if (!first) {
      loadError.value = '暂无最近文件'
      return
    }
    await openRecentFile(first.id)
  }

  function resolvedTheme(): 'light' | 'dark' {
    return globalThis.document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }

  const commandSetup = setupPixelEditorCommands({
    getSession: () => sessionRef.value,
    getPort: () => port.value,
    repo,
    activeTool,
    onChange: () => {
      hasSelection.value = !!port.value.getSelection()
      refreshUndoState()
      scheduleAutosave()
      bumpUiRevision()
    },
    onSave: () => saveDocument(),
    onSaveAs: () => void saveFlow.promptSaveAs(),
    onExport: () => {
      exportDialogOpen.value = true
    },
    onNew: () => createNewDocument(),
    onOpenRecent: () => openMostRecentFile()
  })

  const { bus, bindEditorRuntime, disposeEditorRuntime, transactionManager } = commandSetup

  reloadFromDiskRef = async () => {
    const session = sessionRef.value
    if (!session?.fileId) return
    disposeEditorRuntime()
    await session.openFromFile(session.fileId)
    bindEditorRuntime(session, port.value)
    hasSelection.value = !!port.value.getSelection()
    refreshUndoState()
  }

  refreshUndoState = () => {
    const tx = transactionManager.value
    const engine = port.value
    canUndo.value = tx ? tx.canUndo() : engine.canUndo()
    canRedo.value = tx ? tx.canRedo() : engine.canRedo()
  }

  watch(
    transactionManager,
    (tx) => {
      undoUnsubscribe?.()
      undoUnsubscribe = null
      refreshUndoState()
      if (!tx) return
      undoUnsubscribe = tx.onChange((event) => {
        canUndo.value = event.canUndo
        canRedo.value = event.canRedo
      })
    },
    { immediate: true }
  )

  const canvas = createPixelCanvasCommands(bus)

  const unsubHoldPan = bus.onResult((cmd, result) => {
    if (cmd.type !== PixelCmd.Tool.HoldPan || !result.ok) return
    spacePanActive.value = Boolean(cmd.payload?.active)
  })

  async function toggleGrid() {
    await canvas.toggleGrid(!gridVisible.value)
  }

  async function toggleCheckerboard() {
    await canvas.toggleCheckerboard(!checkerboardVisible.value)
  }

  async function selectAll() {
    await canvas.selectAll()
  }

  async function clearSelectionContent() {
    await canvas.clearSelection()
  }

  async function zoomIn() {
    await canvas.zoomIn()
  }

  async function zoomOut() {
    await canvas.zoomOut()
  }

  async function zoomReset() {
    await canvas.zoomReset()
  }

  async function zoomToFit() {
    const el = canvasWrapRef.value
    if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) return
    await canvas.zoomToFit(rect.width, rect.height)
  }

  function refreshViewportZoom() {
    const meta = sessionRef.value?.content?.meta
    const unit = meta ? getPixelUnitSize(meta) : 1
    viewportZoomPercent.value = zoomPercentFromViewport(port.value.getViewport().zoom, unit)
  }

  async function swapColors() {
    await canvas.swapColors()
  }

  function attachCanvasResizeObserver() {
    resizeObserver?.disconnect()
    const el = canvasWrapRef.value
    if (!el) return
    resizeObserver = new ResizeObserver(() => {
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        port.value.resize()
      })
    })
    resizeObserver.observe(el)
  }

  async function bootstrap() {
    const seq = ++bootstrapSeq
    loadError.value = null
    editorReady.value = false
    spacePanActive.value = false
    disposeEditorRuntime()
    port.value.destroy()

    const engine = new PixelCanvasEngine()
    port.value = engine
    const session = new PixelEditorSession(engine, repo)
    sessionRef.value = session

    engine.bindPointerHandlers({
      onPixelCoords: (x, y) => {
        cursor.value = { x, y }
      },
      onSelectionChange: (sel) => {
        hasSelection.value = !!sel
      },
      onStrokeCommit: (layerId, before, after, label) => {
        void bus.dispatch({
          type: PixelCmd.Document.DrawStroke,
          payload: { layerId, before, after, label: label ?? '笔划' }
        })
      },
      onFillAt: (x, y) => {
        void bus.dispatch({ type: PixelCmd.Document.Fill, payload: { x, y } })
      },
      onPickColorAt: (x, y) => {
        void bus.dispatch({ type: PixelCmd.Document.PickColor, payload: { x, y } })
      },
      onGradientFill: (x0, y0, x1, y1) => {
        void bus.dispatch({
          type: PixelCmd.Document.GradientFill,
          payload: { x0, y0, x1, y1 }
        })
      },
      onShapeDraw: (tool, x0, y0, x1, y1) => {
        if (tool !== 'line' && tool !== 'rect' && tool !== 'ellipse') return
        void bus.dispatch({
          type: PixelCmd.Document.DrawShape,
          payload: { tool, x0, y0, x1, y1 }
        })
      },
      onPanningChange: (active) => {
        canvasPanning.value = active
      },
      onDocumentChange: () => {
        session.syncFromPort(session.content?.meta.activeLayerId)
        bumpUiRevision()
        refreshUndoState()
        scheduleAutosave()
      },
      onColorPicked: (color) => {
        if (session.content) session.content.meta.foreground = color
        bumpUiRevision()
      },
      onViewportChange: () => {
        refreshViewportZoom()
        session.syncViewportFromPort()
        scheduleAutosave()
      }
    })

    try {
      const w = Number(route.query.w) || PIXEL_DEFAULT_SIZE.width
      const h = Number(route.query.h) || PIXEL_DEFAULT_SIZE.height
      if (isNewDraft.value) {
        session.openBlank(w, h)
      } else {
        await session.openFromFile(fileId.value)
      }
      if (seq !== bootstrapSeq) return

      bindEditorRuntime(session, engine)
      engine.setTool(activeTool.value)
      hasSelection.value = !!engine.getSelection()
      bumpUiRevision()

      const wrap = await waitForCanvasWrap()
      if (seq !== bootstrapSeq) return
      mountEditorCanvas(
        engine,
        wrap,
        resolvedTheme(),
        session.content?.meta.viewport,
        session.content
          ? { width: session.content.meta.width, height: session.content.meta.height }
          : undefined
      )
      attachCanvasResizeObserver()
      refreshUndoState()
      refreshViewportZoom()
      editorReady.value = true
    } catch (err) {
      if (seq !== bootstrapSeq) return
      loadError.value = err instanceof Error ? err.message : String(err)
    }
  }

  function selectTool(tool: ToolId) {
    canvas.selectTool(tool)
  }

  async function undo() {
    await canvas.undo()
  }

  async function redo() {
    await canvas.redo()
  }

  usePixelShortcuts({
    bus,
    isActive: () => editorReady.value,
    getCanvasWrap: () => canvasWrapRef.value
  })

  onMounted(() => {
    editorShellMountCount += 1

    if (!sharedRemoveLeaveGuard) {
      sharedRemoveLeaveGuard = router.beforeEach(async (to, from) => {
        if (!isPixelEditorPath(from.path)) return true
        if (isPixelEditorPath(to.path) && to.params.fileId === from.params.fileId) return true
        return flushBeforeLeave()
      })
    }

    if (!sharedRemoveBeforeUnload) {
      function onBeforeUnload(e: BeforeUnloadEvent) {
        if (!sessionRef.value?.dirty) return
        if (sessionRef.value.fileId) void flushSave()
        if (!sessionRef.value?.dirty) return
        e.preventDefault()
      }
      window.addEventListener('beforeunload', onBeforeUnload)
      sharedRemoveBeforeUnload = () => {
        window.removeEventListener('beforeunload', onBeforeUnload)
        sharedRemoveBeforeUnload = null
      }
    }

    void bootstrap()
  })

  onActivated(() => {
    if (editorReady.value) {
      void refreshEditorLayout()
      return
    }
    void bootstrap()
  })
  onBeforeUnmount(() => {
    editorShellMountCount = Math.max(0, editorShellMountCount - 1)
    if (editorShellMountCount === 0) {
      sharedRemoveLeaveGuard?.()
      sharedRemoveLeaveGuard = null
      sharedRemoveBeforeUnload?.()
      sharedRemoveBeforeUnload = null
    }
    disposeAutosave()
    void flushSave()
    undoUnsubscribe?.()
    undoUnsubscribe = null
    unsubHoldPan()
    if (resizeRaf) cancelAnimationFrame(resizeRaf)
    resizeRaf = 0
    resizeObserver?.disconnect()
    disposeEditorRuntime()
    port.value.destroy()
  })

  watch(
    () => `${fileId.value}:${String(route.query.w ?? '')}:${String(route.query.h ?? '')}`,
    (next, prev) => {
      if (!prev || next === prev) return
      void bootstrap()
    }
  )

  watch(
    () => globalThis.document.documentElement.dataset.theme,
    () => port.value.setTheme(resolvedTheme())
  )

  return {
    route,
    router,
    canvasWrapRef,
    port,
    sessionRef,
    editorReady,
    loadError,
    cursor,
    activeTool,
    canUndo,
    canRedo,
    sidePanelTab,
    exportDialogOpen,
    layout,
    viewportZoomPercent,
    fileId,
    isNewDraft,
    docTitle,
    document,
    toolOptions,
    brushPreviewScale,
    isDirty,
    isSaved,
    hasSelection,
    gridVisible,
    checkerboardVisible,
    spacePanActive,
    canvasPanning,
    canvasToolCursorClass: computed(() =>
      editorReady.value
        ? pixelCanvasCursorClass(activeTool.value, {
            spacePan: spacePanActive.value,
            panning: canvasPanning.value
          })
        : ''
    ),
    toolLabel: computed(() => TOOL_LABELS[activeTool.value]),
    selectTool,
    undo,
    redo,
    saveDocument,
    saveAsNew: saveFlow.saveAsNew,
    promptSaveAs: saveFlow.promptSaveAs,
    openRecentFile,
    toggleGrid,
    toggleCheckerboard,
    selectAll,
    clearSelectionContent,
    zoomIn,
    zoomOut,
    zoomReset,
    zoomToFit,
    swapColors,
    refreshViewportZoom,
    conflictOpen: saveFlow.conflictOpen,
    onConflictDismiss: saveFlow.onConflictDismiss,
    onConflictReload: saveFlow.onConflictReload,
    onConflictOverwrite: saveFlow.onConflictOverwrite,
    onConflictSaveAs: saveFlow.onConflictSaveAs,
    unsavedLeaveOpen,
    finishUnsavedLeave,
    goBack,
    createNewDocument,
    bootstrap,
    refreshUndoState,
    toggleSidePanel,
    toggleToolStrip,
    setSidePanelWidth,
    canvas,
    bus
  }
}

export function createDraftRoute(width = 256, height = 256) {
  return {
    name: 'pixel-art-editor' as const,
    params: { fileId: `draft-${crypto.randomUUID()}` },
    query: { w: String(width), h: String(height) }
  }
}

export function openBlankEditor(router: ReturnType<typeof useRouter>, width = 256, height = 256) {
  return pushShellRoute(router, createDraftRoute(width, height))
}

function isSavedViewportUsable(
  viewport: PixelViewport,
  docWidth: number,
  docHeight: number,
  containerWidth: number,
  containerHeight: number
): boolean {
  if (viewport.zoom <= 0) return false
  const contentW = docWidth * viewport.zoom
  const contentH = docHeight * viewport.zoom
  if (!Number.isFinite(contentW) || !Number.isFinite(contentH)) return false
  const right = viewport.panX + contentW
  const bottom = viewport.panY + contentH
  if (right <= 0 || bottom <= 0) return false
  if (viewport.panX >= containerWidth || viewport.panY >= containerHeight) return false
  return true
}

function mountEditorCanvas(
  engine: PixelCanvasEngine,
  el: HTMLElement,
  theme: 'light' | 'dark',
  savedViewport?: PixelViewport,
  docSize?: { width: number; height: number }
): void {
  engine.mount(el)
  engine.setTheme(theme)
  const rect = el.getBoundingClientRect()
  const cw = rect.width > 0 ? rect.width : el.clientWidth
  const ch = rect.height > 0 ? rect.height : el.clientHeight
  if (cw <= 0 || ch <= 0) {
    engine.applyInitialViewport(1, 1)
    return
  }
  const useSaved =
    savedViewport &&
    docSize &&
    isSavedViewportUsable(savedViewport, docSize.width, docSize.height, cw, ch)
  if (useSaved) {
    engine.applyViewport(savedViewport)
  } else {
    engine.applyInitialViewport(cw, ch)
  }
}
