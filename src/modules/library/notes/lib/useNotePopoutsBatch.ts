import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useNotePopoutsBatch() {
  const scopeCount = ref(0)
  const openCount = ref(0)
  const visibleCount = ref(0)

  const anyVisible = computed(() => visibleCount.value > 0)
  const batchLabel = computed(() =>
    anyVisible.value ? '隐藏全部便笺' : '显示全部便笺'
  )

  async function refreshBatchState() {
    try {
      const state = await window.wanwu.notes.popout.getBatchState()
      scopeCount.value = state.scopeCount
      openCount.value = state.openCount
      visibleCount.value = state.visibleCount
    } catch {
      scopeCount.value = 0
      openCount.value = 0
      visibleCount.value = 0
    }
  }

  async function toggleAllPopouts() {
    if (scopeCount.value <= 0) return
    await window.wanwu.notes.popout.toggleAllVisibility()
    await refreshBatchState()
  }

  onMounted(() => {
    void refreshBatchState()
  })

  const stopPopoutListener = window.wanwu.notes.popout.onPopoutState(() => {
    void refreshBatchState()
  })

  onBeforeUnmount(() => {
    stopPopoutListener()
  })

  return {
    scopeCount,
    openCount,
    visibleCount,
    anyVisible,
    batchLabel,
    refreshBatchState,
    toggleAllPopouts
  }
}
