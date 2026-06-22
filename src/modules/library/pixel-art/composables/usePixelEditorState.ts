import { ref, shallowRef, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pushShellRoute } from '@app/composables/shellNavigation'
import { PixelCanvasEngine } from '@modules/library/pixel-art/services/PixelCanvasEngine'
import { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import { getPixelArtRepository } from '@modules/library/pixel-art/services/pixelArtStore'
import { PA_FILES } from '@modules/library/pixel-art/domain/folderIds'
import { PIXEL_DEFAULT_SIZE } from '@modules/library/pixel-art/domain/constants'
import type { ToolId } from '@modules/library/pixel-art/domain/tools'
import { TOOL_LABELS } from '@modules/library/pixel-art/domain/tools'
import { usePixelEditorCommandSetup } from '@modules/library/pixel-art/composables/usePixelEditorCommandSetup'
import { usePixelUndoRedoState } from '@modules/library/pixel-art/composables/usePixelUndoRedoState'
import { usePixelAutosave } from '@modules/library/pixel-art/composables/usePixelAutosave'
import { usePixelSaveFlow } from '@modules/library/pixel-art/composables/usePixelSaveFlow'
import { usePixelShortcuts } from '@modules/library/pixel-art/composables/usePixelShortcuts'
import { usePixelEditorLayout } from '@modules/library/pixel-art/composables/usePixelEditorLayout'
import { bootstrapPixelEditor, mountPixelCanvas } from '@modules/library/pixel-art/composables/usePixelEditorBootstrap'
import { PixelCmd } from '@modules/library/pixel-art/app/command/domain/ids'

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

  const { canUndo, canRedo, refresh: refreshUndoState } = usePixelUndoRedoState(port)
  const { layout, toggleSidePanel } = usePixelEditorLayout()
  const { scheduleAutosave, flushSave, dispose: disposeAutosave } = usePixelAutosave(sessionRef)

  const fileId = computed(() => String(route.params.fileId ?? ''))
  const isNewDraft = computed(() => fileId.value.startsWith('draft-'))
  const docTitle = computed(() => sessionRef.value?.content?.meta.title ?? '未命名像素画')

  function resolvedTheme(): 'light' | 'dark' {
    return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
  }

  function onEditorChange() {
    refreshUndoState()
    scheduleAutosave()
  }

  const saveFlow = usePixelSaveFlow(sessionRef, router, (msg) => {
    loadError.value = msg
  })

  async function saveDocument() {
    await saveFlow.saveDocument()
  }

  const { bus } = usePixelEditorCommandSetup({
    getSession: () => sessionRef.value,
    getPort: () => port.value,
    repo,
    activeTool,
    onChange: onEditorChange,
    onSave: () => saveDocument(),
    onSaveAs: () => void saveFlow.saveAsNew(PA_FILES),
    onExport: () => {
      exportDialogOpen.value = true
    },
    onNew: () => openBlankEditor(router)
  })

  async function bootstrap() {
    loadError.value = null
    editorReady.value = false
    const engine = port.value
    const session = new PixelEditorSession(engine, repo)
    sessionRef.value = session

    engine.bindPointerHandlers({
      onPixelCoords: (x, y) => {
        cursor.value = { x, y }
      },
      onDocumentChange: () => {
        session.syncFromPort(session.content?.meta.activeLayerId)
        onEditorChange()
      },
      onColorPicked: (color) => {
        if (session.content) session.content.meta.foreground = color
      }
    })

    try {
      const w = Number(route.query.w) || PIXEL_DEFAULT_SIZE.width
      const h = Number(route.query.h) || PIXEL_DEFAULT_SIZE.height
      await bootstrapPixelEditor({
        session,
        engine,
        repo,
        fileId: fileId.value,
        isNewDraft: isNewDraft.value,
        width: w,
        height: h
      })
    } catch (err) {
      loadError.value = err instanceof Error ? err.message : String(err)
      return
    }

    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    mountPixelCanvas(engine, canvasWrapRef, resolvedTheme())
    refreshUndoState()
    editorReady.value = true
  }

  function selectTool(tool: ToolId) {
    void bus.dispatch({ type: 'Pixel.Tool.Select', payload: { tool } })
  }

  async function undo() {
    await bus.dispatch({ type: PixelCmd.Document.Undo })
  }

  async function redo() {
    await bus.dispatch({ type: PixelCmd.Document.Redo })
  }

  usePixelShortcuts({
    bus,
    isActive: () => editorReady.value,
    getCanvasWrap: () => canvasWrapRef.value,
    onSpacePan: (active) => {
      spacePanActive.value = active
      if (active) port.value.setTool('hand')
      else port.value.setTool(activeTool.value)
    }
  })

  onMounted(() => void bootstrap())
  onBeforeUnmount(() => {
    disposeAutosave()
    void flushSave()
    port.value.destroy()
  })

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
    fileId,
    isNewDraft,
    docTitle,
    spacePanActive,
    toolLabel: computed(() => TOOL_LABELS[activeTool.value]),
    selectTool,
    undo,
    redo,
    saveDocument,
    saveAsNew: saveFlow.saveAsNew,
    bootstrap,
    refreshUndoState,
    toggleSidePanel,
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
