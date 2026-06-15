import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { resetDiagramGroupFrameDeleteSession } from '@modules/library/diagrams/lib/diagramGroupFrameDeleteConfirm'

export type DiagramEditorRuntimeState = {
  port: LogicFlowDiagramAdapter | null
  session: DiagramEditorSession | null
  bootstrappedDocKey: string | null
}

type BootstrapPromiseSlot = { docKey: string; promise: Promise<void> }

const WINDOW_RUNTIME_KEY = '__wanwuDiagramEditorRuntime'
const WINDOW_READY_DOC_KEY = '__wanwuDiagramEditorReadyDocKey'
const WINDOW_BOOTSTRAP_PROMISE_KEY = '__wanwuDiagramEditorBootstrapPromise'
const WINDOW_SETUP_GEN_KEY = '__wanwuDiagramEditorSetupGen'

function windowStore(): Record<string, unknown> {
  return window as unknown as Record<string, unknown>
}

/** 每次模块加载（含 HMR）更新，用于跳过过期 mount 回调 */
export const diagramEditorSetupGeneration = crypto.randomUUID()
windowStore()[WINDOW_SETUP_GEN_KEY] = diagramEditorSetupGeneration

export function isDiagramEditorSetupCurrent(): boolean {
  return windowStore()[WINDOW_SETUP_GEN_KEY] === diagramEditorSetupGeneration
}

export function diagramEditorDocKey(fileId: unknown, template: unknown): string {
  return `${String(fileId ?? 'new')}|${String(template ?? '')}`
}

function getReadyDocKey(): string | null {
  const v = windowStore()[WINDOW_READY_DOC_KEY]
  return typeof v === 'string' ? v : null
}

export function setDiagramEditorReadyDocKey(docKey: string | null): void {
  const w = windowStore()
  if (docKey) w[WINDOW_READY_DOC_KEY] = docKey
  else delete w[WINDOW_READY_DOC_KEY]
}

/** 跨 HMR/remount 复用画布运行时（挂 window，单页内持久） */
export function getDiagramEditorRuntime(): DiagramEditorRuntimeState {
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

export function destroyDiagramEditorRuntime(): void {
  resetDiagramGroupFrameDeleteSession()
  const rt = getDiagramEditorRuntime()
  rt.port?.destroy()
  rt.port = null
  rt.session = null
  rt.bootstrappedDocKey = null
  const w = windowStore()
  delete w[WINDOW_BOOTSTRAP_PROMISE_KEY]
  setDiagramEditorReadyDocKey(null)
}

export function isDiagramEditorRuntimeReady(docKey: string): boolean {
  const rt = getDiagramEditorRuntime()
  const readyDocKey = getReadyDocKey()
  if (readyDocKey !== docKey) return false
  if (!rt.port || !rt.session) return false
  rt.bootstrappedDocKey = docKey
  return true
}

/** window 级单例 Promise：全页只 cold bootstrap 一次，后续 mount 仅 join */
export function ensureDiagramEditorBootstrap(
  docKey: string,
  execute: () => Promise<void>
): Promise<void> {
  if (isDiagramEditorRuntimeReady(docKey)) return Promise.resolve()

  const w = windowStore()
  const slot = w[WINDOW_BOOTSTRAP_PROMISE_KEY] as BootstrapPromiseSlot | undefined
  if (slot?.docKey === docKey) {
    return slot.promise
  }

  if (slot) delete w[WINDOW_BOOTSTRAP_PROMISE_KEY]

  const promise = execute().catch((err: unknown) => {
    delete w[WINDOW_BOOTSTRAP_PROMISE_KEY]
    throw err
  })
  w[WINDOW_BOOTSTRAP_PROMISE_KEY] = { docKey, promise }
  return promise
}

export function clearDiagramEditorBootstrapPromise(): void {
  delete windowStore()[WINDOW_BOOTSTRAP_PROMISE_KEY]
}

export function hasDiagramEditorBootstrapInFlight(): boolean {
  return Boolean(windowStore()[WINDOW_BOOTSTRAP_PROMISE_KEY])
}
