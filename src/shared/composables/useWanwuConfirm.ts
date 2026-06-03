import { nextTick } from 'vue'
import { useConfirm } from 'primevue/useconfirm'
import { ensureConfirmDialogMounted } from '@app/bootstrap/overlayHosts'

export interface WanwuConfirmOptions {
  header?: string
  message: string
  acceptLabel?: string
  rejectLabel?: string
  danger?: boolean
}

export function useWanwuConfirm() {
  const confirm = useConfirm()

  function ask(options: WanwuConfirmOptions): Promise<boolean> {
    ensureConfirmDialogMounted()
    return new Promise((resolve) => {
      void nextTick(() => {
        confirm.require({
        header: options.header ?? '确认',
        message: options.message,
        rejectLabel: options.rejectLabel ?? '取消',
        acceptLabel: options.acceptLabel ?? '确定',
        rejectProps: {
          label: options.rejectLabel ?? '取消',
          severity: 'secondary',
          text: true
        },
        acceptProps: {
          label: options.acceptLabel ?? '确定',
          severity: options.danger ? 'danger' : 'primary'
        },
        accept: () => resolve(true),
        reject: () => resolve(false)
        })
      })
    })
  }

  return { ask }
}
