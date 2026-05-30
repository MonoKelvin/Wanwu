import { reactive } from 'vue'
import type { DismissiblePromptId } from '@shared/constants/dismissiblePrompts'
import {
  dismissDismissiblePrompt,
  isDismissiblePromptSkipped
} from '@shared/utils/dismissiblePrompts'

export interface DismissibleConfirmOptions {
  id: DismissiblePromptId
  header: string
  message: string
  detail?: string
  acceptLabel?: string
  rejectLabel?: string
  danger?: boolean
}

type Resolver = (accepted: boolean) => void

export const dismissibleConfirmState = reactive({
  open: false,
  header: '',
  message: '',
  detail: '',
  acceptLabel: '确定',
  rejectLabel: '取消',
  danger: false,
  skipChecked: false,
  promptId: '' as DismissiblePromptId | '',
  _resolve: null as Resolver | null
})

export function useDismissibleConfirm() {
  function ask(options: DismissibleConfirmOptions): Promise<boolean> {
    if (isDismissiblePromptSkipped(options.id)) {
      return Promise.resolve(true)
    }

    return new Promise((resolve) => {
      dismissibleConfirmState.promptId = options.id
      dismissibleConfirmState.header = options.header
      dismissibleConfirmState.message = options.message
      dismissibleConfirmState.detail = options.detail ?? ''
      dismissibleConfirmState.acceptLabel = options.acceptLabel ?? '确定'
      dismissibleConfirmState.rejectLabel = options.rejectLabel ?? '取消'
      dismissibleConfirmState.danger = options.danger ?? false
      dismissibleConfirmState.skipChecked = false
      dismissibleConfirmState._resolve = resolve
      dismissibleConfirmState.open = true
    })
  }

  function accept() {
    const id = dismissibleConfirmState.promptId
    if (dismissibleConfirmState.skipChecked && id) {
      dismissDismissiblePrompt(id)
    }
    dismissibleConfirmState.open = false
    dismissibleConfirmState._resolve?.(true)
    dismissibleConfirmState._resolve = null
  }

  function reject() {
    dismissibleConfirmState.open = false
    dismissibleConfirmState._resolve?.(false)
    dismissibleConfirmState._resolve = null
  }

  return { ask, accept, reject, state: dismissibleConfirmState }
}
