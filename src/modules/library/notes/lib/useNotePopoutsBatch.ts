import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

function readCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0
}

function readCanShowAll(state: {
  scopeCount?: unknown
  openCount?: unknown
  visibleCount?: unknown
  showableCount?: unknown
  canShowAll?: unknown
}): boolean {
  if (typeof state.canShowAll === 'boolean') return state.canShowAll
  if (typeof state.showableCount === 'number') return readCount(state.showableCount) > 0
  const scopeCount = readCount(state.scopeCount)
  if (scopeCount <= 0) return false
  const openCount = readCount(state.openCount)
  const visibleCount = readCount(state.visibleCount)
  return openCount > 0 && visibleCount < openCount
}

function readCanHideAll(state: {
  visibleCount?: unknown
  canHideAll?: unknown
}): boolean {
  if (typeof state.canHideAll === 'boolean') return state.canHideAll
  return readCount(state.visibleCount) > 0
}

export function useNotePopoutsBatch() {
  const scopeCount = ref(0)
  const openCount = ref(0)
  const visibleCount = ref(0)
  const showableCount = ref(0)
  const canShowAll = ref(false)
  const canHideAll = ref(false)

  const anyVisible = computed(() => visibleCount.value > 0)
  const batchLabel = computed(() =>
    anyVisible.value ? '隐藏全部便笺' : '显示全部便笺'
  )
  const batchDisabled = computed(() =>
    anyVisible.value ? !canHideAll.value : !canShowAll.value
  )

  async function refreshBatchState() {
    try {
      const state = await window.wanwu.notes.popout.getBatchState()
      scopeCount.value = readCount(state.scopeCount)
      openCount.value = readCount(state.openCount)
      visibleCount.value = readCount(state.visibleCount)
      showableCount.value = readCount(state.showableCount)
      canShowAll.value = readCanShowAll(state)
      canHideAll.value = readCanHideAll(state)
    } catch {
      scopeCount.value = 0
      openCount.value = 0
      visibleCount.value = 0
      showableCount.value = 0
      canShowAll.value = false
      canHideAll.value = false
    }
  }

  async function toggleAllPopouts() {
    if (batchDisabled.value) return
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
    showableCount,
    canShowAll,
    canHideAll,
    anyVisible,
    batchDisabled,
    batchLabel,
    refreshBatchState,
    toggleAllPopouts
  }
}
