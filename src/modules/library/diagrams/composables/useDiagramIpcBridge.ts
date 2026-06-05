import { onMounted, onUnmounted } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'

/** 监听主进程转发的 canvas/page/document 命令并回传结果 */
export function useDiagramIpcBridge(bus: IDiagramCommandBus | null) {
  let unsubscribe: (() => void) | null = null

  onMounted(() => {
    if (!bus) return
    unsubscribe = window.wanwu.diagrams.onRunCommands(async ({ requestId, cmds }) => {
      const results = await bus.dispatchBatch(cmds, { stopOnError: true })
      window.wanwu.diagrams.sendRunCommandsResult(requestId, results)
    })
  })

  onUnmounted(() => {
    unsubscribe?.()
  })
}
