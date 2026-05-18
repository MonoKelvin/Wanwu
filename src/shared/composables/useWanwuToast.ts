import { useToast } from 'primevue/usetoast'

const TOAST_LIFE = 4500

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

  function success(detail: string, summary = '完成') {
    toast.add({
      severity: 'success',
      summary,
      detail,
      life: 3000,
      closable: true
    })
  }

  function info(detail: string, summary = '提示') {
    toast.add({
      severity: 'info',
      summary,
      detail,
      life: TOAST_LIFE,
      closable: true
    })
  }

  return { error, success, info }
}
