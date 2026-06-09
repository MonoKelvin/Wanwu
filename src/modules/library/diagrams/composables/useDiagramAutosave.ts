import { onUnmounted, ref, watch, type Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'

export function useDiagramAutosave(options: {
  bus: IDiagramCommandBus
  session: Ref<DiagramEditorSession | null>
  debounceMs?: number
  isBlocked?: () => boolean
  onSaveError?: (message: string) => void
  onConflict?: () => void
  savePayload?: () => Record<string, unknown> | undefined
}) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const isSaving = ref(false)
  let saveChain: Promise<boolean> = Promise.resolve(true)
  const debounceMs = options.debounceMs ?? 800
  let retryBackoffMs = debounceMs

  function cancelScheduledSave() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function runSave(): Promise<boolean> {
    if (options.isBlocked?.()) return false
    const session = options.session.value
    if (!session?.dirty) return true
    // 未首次保存的文档不自动落盘，须用户显式选择保存位置
    if (!session.fileId) return true

    isSaving.value = true
    try {
      const result = await options.bus.dispatch({
        type: 'document.save',
        payload: { ...options.savePayload?.(), auto: true }
      })
      if (!result.ok) {
        if (result.code === 'CONFLICT') {
          options.onConflict?.()
        } else {
          options.onSaveError?.(result.message ?? '自动保存失败')
          scheduleSave(true)
        }
        return false
      }
      retryBackoffMs = debounceMs
      return true
    } finally {
      isSaving.value = false
    }
  }

  function enqueueSave(): Promise<boolean> {
    saveChain = saveChain.then(() => runSave())
    return saveChain
  }

  function scheduleSave(isRetry = false) {
    if (options.isBlocked?.()) return
    if (!options.session.value?.dirty) return
    cancelScheduledSave()
    const delay = isRetry ? retryBackoffMs : debounceMs
    if (isRetry) {
      retryBackoffMs = Math.min(retryBackoffMs * 2, 8000)
    }
    timer = setTimeout(() => {
      timer = null
      void enqueueSave()
    }, delay)
  }

  /** 离开页面前调用：取消防抖并等待进行中的保存完成 */
  async function flush(): Promise<boolean> {
    cancelScheduledSave()
    if (!options.session.value?.dirty) return true
    if (isSaving.value) {
      await saveChain
      return !options.session.value?.dirty
    }
    return enqueueSave()
  }

  const stopDirty = watch(
    () => options.session.value?.dirty,
    (dirty) => {
      if (dirty) scheduleSave()
      else cancelScheduledSave()
    }
  )

  const stopDirtyPages = watch(
    () => {
      const session = options.session.value
      if (!session?.dirty) return null
      return [session.dirtyPageIds.size, session.metaDirty] as const
    },
    (state) => {
      if (state) scheduleSave()
    }
  )

  const stopFile = watch(
    () => options.session.value?.fileId,
    () => cancelScheduledSave()
  )

  onUnmounted(() => {
    stopDirty()
    stopDirtyPages()
    stopFile()
    cancelScheduledSave()
  })

  return { scheduleSave, cancelScheduledSave, flush, isSaving }
}
