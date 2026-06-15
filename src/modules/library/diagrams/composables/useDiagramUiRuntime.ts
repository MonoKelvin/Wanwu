import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import type { DiagramUiRuntime } from '@modules/library/diagrams/app/command/ui/DiagramUiCommand'

/** 为 UI 组合命令注入 toast / 确认框 */
export function useDiagramUiRuntime(): DiagramUiRuntime {
  const toast = useWanwuToast()
  const { ask } = useWanwuConfirm()
  return {
    toast,
    confirm: (options) =>
      ask({
        header: options.header,
        message: options.message,
        acceptLabel: options.acceptLabel,
        rejectLabel: options.rejectLabel
      })
  }
}
