import type { DiagramFileOpenParams } from '@modules/library/diagrams/app/command/domain/payloads'
import { nextTick, type ComputedRef, type Ref } from 'vue'
import type { RouteLocationNormalizedLoaded, Router } from 'vue-router'
import type { useToast } from 'primevue/usetoast'
import { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { registerDiagramEditorUi } from '@modules/library/diagrams/app/diagramEditorUiBootstrap'
import { DiagramRepositoryIpcAdapter } from '@modules/library/diagrams/services/DiagramRepositoryIpcAdapter'
import type { useDiagramPortBinding } from '@modules/library/diagrams/composables/useDiagramPortBinding'
import {
  getDiagramEditorRuntime,
  isDiagramEditorRuntimeReady,
  setDiagramEditorReadyDocKey
} from '@modules/library/diagrams/composables/useDiagramEditorRuntime'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import {
  createDiagramCanvasCommands
} from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import { createDiagramFileCommands } from '@modules/library/diagrams/composables/useDiagramFileCommands'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'

export interface UseDiagramEditorBootstrapOptions {
  bus: IDiagramCommandBus
  repo: DiagramRepositoryIpcAdapter
  route: RouteLocationNormalizedLoaded
  router: Router
  toast: ReturnType<typeof useToast>
  canvasRef: Ref<HTMLElement | null>
  portRef: Ref<LogicFlowDiagramAdapter | null>
  sessionRef: Ref<DiagramEditorSession | null>
  portBinding: Pick<
    ReturnType<typeof useDiagramPortBinding>,
    'wirePortHandlers' | 'attachCanvasObservers'
  >
  loadError: Ref<string | null>
  editorReady: Ref<boolean>
  pickedFolderId: Ref<string | null>
  refreshViewportZoom: () => void
  resolvedTheme: () => 'light' | 'dark'
  fileId: ComputedRef<string>
  templateQuery: ComputedRef<string | undefined>
  isNewDraft: ComputedRef<boolean>
}

export interface DiagramEditorBootstrapApi {
  waitForLayout(): Promise<void>
  waitForCanvasEl(): Promise<HTMLElement>
  openDocument(): Promise<void>
  executeBootstrap(docKey: string): Promise<void>
}

export function useDiagramEditorBootstrap(
  options: UseDiagramEditorBootstrapOptions
): DiagramEditorBootstrapApi {
  const {
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
  } = options

  const fileCommands = createDiagramFileCommands(bus)
  const canvasCommands = createDiagramCanvasCommands(bus)

  function applyFolderIdFromRoute(): void {
    const raw = route.query.folderId
    if (typeof raw !== 'string' || !raw) return
    if (raw === DG_HOME || raw === DG_RECYCLE) return
    pickedFolderId.value = raw
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

  async function applyFitView(): Promise<void> {
    await waitForLayout()
    portRef.value?.resize()
    await canvasCommands.zoomToFit()
    refreshViewportZoom()
  }

  async function applyCenterContentView(resetZoom: boolean): Promise<void> {
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

  async function openDocument(): Promise<void> {
    loadError.value = null
    if (isNewDraft.value) applyFolderIdFromRoute()
    const wantFitView = route.query.fitView === '1'
    const payload: DiagramFileOpenParams = { skipViewport: true }
    if (!isNewDraft.value) {
      payload.fileId = fileId.value
    } else if (templateQuery.value) {
      payload.templateId = templateQuery.value
    }
    const result = await fileCommands.open(payload)
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

  async function executeBootstrap(docKey: string): Promise<void> {
    registerDiagramEditorUi()

    const rt = getDiagramEditorRuntime()
    if (isDiagramEditorRuntimeReady(docKey)) {
      return
    }

    if (rt.bootstrappedDocKey && rt.bootstrappedDocKey !== docKey) {
      rt.port?.destroy()
      rt.port = null
      rt.session = null
      rt.bootstrappedDocKey = null
    }

    await import('@logicflow/core/lib/style/index.css')
    await import('@logicflow/extension/lib/style/index.css')
    const {
      LogicFlowDiagramAdapter: Adapter,
      ensureSnapshotPlugin,
      ensureMiniMapPlugin,
      ensureSelectionSelectPlugin
    } = await import('@modules/library/diagrams/services/LogicFlowDiagramAdapter')
    await ensureSnapshotPlugin()
    await ensureMiniMapPlugin()
    await ensureSelectionSelectPlugin()

    const port = new Adapter()
    const session = new DiagramEditorSession(port, repo)
    rt.port = port
    rt.session = session
    portRef.value = port
    sessionRef.value = session

    portBinding.wirePortHandlers(port, session)

    const el = await waitForCanvasEl()
    port.mount(el)
    port.setTheme(resolvedTheme())
    portBinding.attachCanvasObservers(port, el)

    port.resize()
    await openDocument()
    rt.bootstrappedDocKey = docKey
    setDiagramEditorReadyDocKey(docKey)
    editorReady.value = true
    refreshViewportZoom()
    await waitForLayout()
    port.resize()
  }

  return {
    waitForLayout,
    waitForCanvasEl,
    openDocument,
    executeBootstrap
  }
}
