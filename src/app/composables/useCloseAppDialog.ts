import { onMounted, onUnmounted, ref } from 'vue'

export function useCloseAppDialog() {
  const closeDialogVisible = ref(false)

  function closeDialog() {
    closeDialogVisible.value = false
  }

  async function resolveChoice(choice: 'tray' | 'quit' | 'cancel') {
    closeDialog()
    await window.wanwu.window.resolveClosePrompt(choice)
  }

  let stopPrompt: (() => void) | undefined

  onMounted(() => {
    stopPrompt = window.wanwu.window.onClosePrompt(() => {
      closeDialogVisible.value = true
    })
  })

  onUnmounted(() => {
    stopPrompt?.()
  })

  return {
    closeDialogVisible,
    onCloseTray: () => resolveChoice('tray'),
    onCloseQuit: () => resolveChoice('quit'),
    onCloseCancel: () => resolveChoice('cancel')
  }
}
