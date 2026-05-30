import { useToast } from 'primevue/usetoast'
import type { WanwuToastAction, WanwuToastMessagePayload, WanwuToastOptions } from '@shared/types/toast'

const TOAST_LIFE = 4500
const TOAST_LIFE_WITH_ACTION = 8000

function withActionFields(options?: WanwuToastOptions): Partial<WanwuToastMessagePayload> {
  if (!options?.action) return {}
  return {
    actionLabel: options.action.label,
    onAction: options.action.onClick
  }
}

export function useWanwuToast() {
  const toast = useToast()

  function error(detail: string, summary = '请求失败') {
    toast.add({
      severity: 'error',
      summary,
      detail,
      life: TOAST_LIFE,
      closable: true
    })
  }

  function success(detail: string, summary = '完成', options?: WanwuToastOptions) {
    toast.add({
      severity: 'success',
      summary,
      detail,
      life: options?.action ? TOAST_LIFE_WITH_ACTION : (options?.life ?? 3000),
      closable: true,
      ...withActionFields(options)
    })
  }

  function info(detail: string, summary = '提示', options?: WanwuToastOptions) {
    toast.add({
      severity: 'info',
      summary,
      detail,
      life: options?.action ? TOAST_LIFE_WITH_ACTION : (options?.life ?? TOAST_LIFE),
      closable: true,
      ...withActionFields(options)
    })
  }

  /** 在 Toast 中提供「打开所在文件夹」（备份、导出日志等） */
  function revealInFolderAction(filePath: string): WanwuToastAction {
    return {
      label: '打开所在文件夹',
      onClick: async () => {
        const revealed = await window.wanwu.shell.showItemInFolder(filePath)
        if (!revealed.ok) error('无法打开所在文件夹')
      }
    }
  }

  return { error, success, info, revealInFolderAction }
}
