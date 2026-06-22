import { ref, shallowRef, onMounted, onBeforeUnmount, onActivated, watch, computed, provide, type Ref, type InjectionKey, type ShallowRef } from 'vue'
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
import { createPixelTransactionManager, recordPixelStroke } from '@modules/library/pixel-art/app/createPixelTransactionManager'
import { usePixelSaveFlow } from '@modules/library/pixel-art/composables/usePixelSaveFlow'
import { usePixelShortcuts } from '@modules/library/pixel-art/composables/usePixelShortcuts'
import { createPixelCanvasCommands } from '@modules/library/pixel-art/app/command/pixelCanvasCommands'
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
    port.setStrokeRecorder((layerId, before, after) => {
      void recordPixelStroke(manager, layerId, before, after).then(() => options.onChange?.())
    })
  }

  function disposeEditorRuntime(): void {
    options.getPort()?.setStrokeRecorder(null)
    setPixelTransactionManager(transactionManager, null)
  }

  return { bus, transactionManager, bindEditorRuntime, disposeEditorRuntime }
}

let editorShellMountCount = 0
let sharedRemoveLeaveGuard: (() => void) | null = null
let sharedRemoveBeforeUnload: (() => void) | null = null

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
  let undoUnsubscribe: (() => void) | null = null
  let refreshUndoState: () => void = () => {}
  let reloadFromDiskRef: () => Promise<void> = async () => {}

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
    const choice = await askUnsavedLeave()
    if (choice === 'cancel') return false
    if (choice === 'discard') return true
    const result = await saveFlow.saveDocument()
    return result === 'ok'
  }

  async function flushBeforeLeave(): Promise<NavigationGuardReturn> {
    const session = sessionRef.value
    if (!session?.dirty) return true

    if (session.fileId) {
      await flushSave()
      if (!sessionRef.value?.dirty) return true
    } else {
      cancelScheduledSave()
    }

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
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }

  const commandSetup = setupPixelEditorCommands({
    getSession: () => sessionRef.value,
    getPort: () => port.value,
    repo,
    activeTool,
    onChange: () => {
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
    canUndo.value = tx?.canUndo() ?? false
    canRedo.value = tx?.canRedo() ?? false
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
    viewportZoomPercent.value = Math.round(port.value.getViewport().zoom * 100)
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
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : String(err)
      return
    }

    bindEditorRuntime(session, engine)
    engine.setTool(activeTool.value)
    hasSelection.value = !!engine.getSelection()
    bumpUiRevision()

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    mountEditorCanvas(engine, canvasWrapRef, resolvedTheme())
    attachCanvasResizeObserver()
    refreshUndoState()
    refreshViewportZoom()
    editorReady.value = true
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
        if (!isPixelEditorPath(from.path) || isPixelEditorPath(to.path)) return true
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
  })

  onActivated(() => {
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
      if (next && next !== prev) void bootstrap()
    }
  )

  watch(
    () => document.documentElement.dataset.theme,
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
    isDirty,
    isSaved,
    hasSelection,
    gridVisible,
    checkerboardVisible,
    spacePanActive,
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

export function createDraftRoute(width = 32, height = 32) {
  return {
    name: 'pixel-art-editor' as const,
    params: { fileId: `draft-${crypto.randomUUID()}` },
    query: { w: String(width), h: String(height) }
  }
}

export function openBlankEditor(router: ReturnType<typeof useRouter>, width = 32, height = 32) {
  return pushShellRoute(router, createDraftRoute(width, height))
}

function mountEditorCanvas(
  engine: PixelCanvasEngine,
  canvasWrapRef: Ref<HTMLElement | null>,
  theme: 'light' | 'dark'
): void {
  const el = canvasWrapRef.value
  if (!el) return
  engine.mount(el)
  engine.setTheme(theme)
  const rect = el.getBoundingClientRect()
  engine.zoomToFit(rect.width, rect.height)
}
