/**
 * 编辑器组合根：绑定 CommandBus、TransactionManager、拖拽 undo recorder 与剪贴板 actions。
 * session/port 就绪后注册 finishDrag 回调；销毁时释放 tx 与 bus 订阅。
 */
import { onBeforeUnmount, watch, type ShallowRef } from 'vue'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { createDiagramCommandBus } from '@modules/library/diagrams/app/command/createDiagramCommandBus'
import { provideDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { createDiagramCanvasCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import {
  provideDiagramTransactionManager,
  setDiagramTransactionManager
} from '@modules/library/diagrams/composables/useDiagramTransactionManager'
import {
  createDiagramTransactionManager,
  type DiagramTransactionBundle
} from '@modules/library/diagrams/app/transaction/createDiagramTransactionManager'
import { DiagramRepositoryIpcAdapter } from '@modules/library/diagrams/services/DiagramRepositoryIpcAdapter'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import {
  createDiagramCanvasClipboardActions,
  provideDiagramCanvasClipboard
} from '@modules/library/diagrams/composables/useDiagramCanvasClipboard'

export interface UseDiagramEditorCommandSetupOptions {
  sessionRef: ShallowRef<DiagramEditorSession | null>
  portRef: ShallowRef<LogicFlowDiagramAdapter | null>
  getFileId: () => string
}

export interface DiagramEditorCommandSetup {
  bus: IDiagramCommandBus
  repo: DiagramRepositoryIpcAdapter
  onDocumentSaved: () => void
  dispose: () => void
}

/** 编辑器命令组合根：Bus + 事务 + 拖拽 undo + 剪贴板 */
export function useDiagramEditorCommandSetup(
  options: UseDiagramEditorCommandSetupOptions
): DiagramEditorCommandSetup {
  const repo = new DiagramRepositoryIpcAdapter()
  const txHolder = provideDiagramTransactionManager(null)
  let txBundle: DiagramTransactionBundle | null = null

  function disposeTransaction() {
    options.portRef.value?.setDocumentCommandBridge(null)
    txBundle?.detachSpill()
    if (txBundle) txBundle.spill.clear(txBundle.resourceId)
    txBundle = null
    setDiagramTransactionManager(txHolder, null)
  }

  function bindTransaction() {
    const session = options.sessionRef.value
    const port = options.portRef.value
    if (!session || !port) return
    disposeTransaction()
    const fileId = session.fileId ?? options.getFileId()
    txBundle = createDiagramTransactionManager(fileId, session, port)
    setDiagramTransactionManager(txHolder, txBundle.manager)
  }

  function wireDocumentCommandBridge() {
    options.portRef.value?.setDocumentCommandBridge({
      finishDrag: (payload) => {
        void canvasCommands.finishDrag(payload)
      },
      formatPainterApply: (payload) => {
        void canvasCommands.formatPainterApply(payload)
      },
      insertNodeOnEdge: (payload) => {
        void canvasCommands.insertNodeOnEdge(payload)
      },
      modifyNode: (payload) => {
        void canvasCommands.modifyNode(payload)
      }
    })
  }

  const bus = createDiagramCommandBus({
    getSession: () => options.sessionRef.value,
    getPort: () => options.portRef.value,
    getTransactionManager: () => txHolder.value,
    repo
  })
  provideDiagramCommandBus(bus)
  const canvasCommands = createDiagramCanvasCommands(bus)
  provideDiagramCanvasClipboard(
    createDiagramCanvasClipboardActions(
      canvasCommands.copy,
      canvasCommands.paste,
      () => options.portRef.value
    )
  )

  watch(
    () => [options.sessionRef.value, options.portRef.value, options.getFileId()] as const,
    () => {
      bindTransaction()
      wireDocumentCommandBridge()
    },
    { immediate: true, flush: 'post' }
  )

  function onDocumentSaved() {
    txHolder.value?.markClean()
    txBundle?.spill.clear(txBundle.resourceId)
  }

  function dispose() {
    disposeTransaction()
  }

  onBeforeUnmount(dispose)

  return { bus, repo, onDocumentSaved, dispose }
}
