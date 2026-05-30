import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue'

export interface PopoutScreenAnchor {
  x: number
  y: number
}

export function useNotePopout(noteId: Ref<string | null | undefined>) {
  const isPopoutOpen = ref(false)
  const isPopoutVisible = ref(false)
  const alwaysOnTop = ref(false)
  const userDismissed = ref(false)

  const popoutToggleLabel = computed(() => {
    if (!isPopoutOpen.value) return '打开独立窗口'
    if (isPopoutVisible.value) return '关闭独立窗口'
    if (userDismissed.value) return '打开独立窗口'
    return '显示独立窗口'
  })

  async function refreshUserDismissed(id: string) {
    try {
      const result = await window.wanwu.notes.popout.getVisibilityOverride(id)
      userDismissed.value = result.visibilityOverride === 'user-hidden'
    } catch {
      userDismissed.value = false
    }
  }

  async function refreshState() {
    const id = noteId.value
    if (!id) {
      isPopoutOpen.value = false
      isPopoutVisible.value = false
      alwaysOnTop.value = false
      userDismissed.value = false
      return
    }
    try {
      isPopoutOpen.value = await window.wanwu.notes.popout.isOpen(id)
      isPopoutVisible.value = await window.wanwu.notes.popout.isVisible(id)
      const top = await window.wanwu.notes.popout.getAlwaysOnTop(id)
      alwaysOnTop.value = top.alwaysOnTop
      await refreshUserDismissed(id)
    } catch {
      isPopoutOpen.value = false
      isPopoutVisible.value = false
      userDismissed.value = false
    }
  }

  async function togglePopout(scrollTop?: number, anchor?: PopoutScreenAnchor) {
    const id = noteId.value
    if (!id) return
    const result = await window.wanwu.notes.popout.toggleVisibility(id, scrollTop, anchor)
    isPopoutOpen.value = result.open
    isPopoutVisible.value = result.visible
    await refreshUserDismissed(id)
    if (result.open) {
      const top = await window.wanwu.notes.popout.getAlwaysOnTop(id)
      alwaysOnTop.value = top.alwaysOnTop
    } else {
      alwaysOnTop.value = false
    }
  }

  async function toggleAlwaysOnTop() {
    const id = noteId.value
    if (!id) return
    const result = await window.wanwu.notes.popout.toggleAlwaysOnTop(id)
    alwaysOnTop.value = result.alwaysOnTop
  }

  async function closeCurrentPopout(scrollTop?: number) {
    await window.wanwu.notes.popout.closeCurrent(scrollTop)
    await refreshState()
  }

  const stopWatch = watch(noteId, () => void refreshState(), { immediate: true })

  const stopPopoutListener = window.wanwu.notes.popout.onPopoutState((payload) => {
    const id = noteId.value
    if (!id || payload.noteId !== id) return
    isPopoutOpen.value = payload.open
    isPopoutVisible.value = payload.visible
    void refreshUserDismissed(id)
    if (!payload.open) {
      alwaysOnTop.value = false
      return
    }
    void window.wanwu.notes.popout.getAlwaysOnTop(id).then((top) => {
      alwaysOnTop.value = top.alwaysOnTop
    })
  })

  onBeforeUnmount(() => {
    stopWatch()
    stopPopoutListener()
  })

  return {
    isPopoutOpen,
    isPopoutVisible,
    alwaysOnTop,
    popoutToggleLabel,
    refreshState,
    togglePopout,
    toggleAlwaysOnTop,
    closeCurrentPopout
  }
}
