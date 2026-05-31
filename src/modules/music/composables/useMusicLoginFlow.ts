import { onUnmounted, type Ref } from 'vue'

const AUTO_CLOSE_MS = 400

export function useMusicLoginFlow(opts: {
  visible: Ref<boolean>
  loading: Ref<boolean>
  message: Ref<string | null>
  emit: (event: 'success') => void
}) {
  let closeTimer: ReturnType<typeof setTimeout> | null = null

  function clearCloseTimer() {
    if (closeTimer) {
      clearTimeout(closeTimer)
      closeTimer = null
    }
  }

  function finishError(msg: string) {
    clearCloseTimer()
    opts.loading.value = false
    opts.message.value = msg
  }

  function finishSuccess(successMsg = '登录成功') {
    clearCloseTimer()
    opts.loading.value = false
    opts.message.value = successMsg
    opts.emit('success')
    closeTimer = setTimeout(() => {
      opts.visible.value = false
      closeTimer = null
    }, AUTO_CLOSE_MS)
  }

  function finishInfo(msg: string) {
    opts.loading.value = false
    opts.message.value = msg
  }

  onUnmounted(clearCloseTimer)

  return { finishSuccess, finishError, finishInfo }
}
