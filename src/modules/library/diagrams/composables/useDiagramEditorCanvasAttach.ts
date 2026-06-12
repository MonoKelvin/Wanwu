import type { Ref } from 'vue'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { useDiagramPortBinding } from '@modules/library/diagrams/composables/useDiagramPortBinding'

export interface AttachDiagramEditorCanvasOptions {
  portRef: Ref<LogicFlowDiagramAdapter | null>
  sessionRef: Ref<DiagramEditorSession | null>
  portBinding: Pick<ReturnType<typeof useDiagramPortBinding>, 'wirePortHandlers' | 'attachCanvasObservers'>
  waitForCanvasEl: () => Promise<HTMLElement>
  refreshViewportZoom: () => void
  resolvedTheme: () => 'light' | 'dark'
  editorReady: Ref<boolean>
  loading: Ref<boolean>
}

/**
 * HMR/remount 时复用 window 级 runtime，重新 mount 画布并绑定 port 回调。
 */
export async function attachDiagramEditorFromRuntime(
  docKey: string,
  isReady: (key: string) => boolean,
  getRuntime: () => { port: LogicFlowDiagramAdapter | null; session: DiagramEditorSession | null },
  options: AttachDiagramEditorCanvasOptions,
  attempt = 0
): Promise<boolean> {
  if (!isReady(docKey)) return false

  const rt = getRuntime()
  if (!rt.port || !rt.session) return false

  options.portRef.value = rt.port
  options.sessionRef.value = rt.session
  options.editorReady.value = true
  options.loading.value = false

  options.portBinding.wirePortHandlers(rt.port, rt.session)
  try {
    const el = await options.waitForCanvasEl()
    rt.port.mount(el)
    options.portBinding.attachCanvasObservers(rt.port, el)
    rt.port.setTheme(options.resolvedTheme())
    rt.port.resize()
    options.refreshViewportZoom()
    return true
  } catch (err) {
    if (attempt < 8) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      return attachDiagramEditorFromRuntime(docKey, isReady, getRuntime, options, attempt + 1)
    }
    throw err
  }
}
