import { onUnmounted, watch, type Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'

export function useDiagramAutosave(options: {
  bus: IDiagramCommandBus
  session: Ref<DiagramEditorSession | null>
  debounceMs?: number
  isBlocked?: () => boolean
  onSaveError?: (message: string) => void
  savePayload?: () => Record<string, unknown> | undefined
}) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let saving = false
  const debounceMs = options.debounceMs ?? 2000

  function cancelScheduledSave() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function runSave() {
    if (saving || options.isBlocked?.()) return
    const session = options.session.value
    if (!session?.fileId || !session.dirty) return

    saving = true
    try {
      const result = await options.bus.dispatch({
        type: 'document.save',
        payload: options.savePayload?.()
      })
      if (!result.ok && result.code !== 'CONFLICT') {
        options.onSaveError?.(result.message ?? '自动保存失败')
      }
    } finally {
      saving = false
    }
  }

  function scheduleSave() {
    if (options.isBlocked?.()) return
    if (!options.session.value?.fileId) return
    cancelScheduledSave()
    timer = setTimeout(() => {
      timer = null
      void runSave()
    }, debounceMs)
  }

  const stopDirty = watch(
    () => options.session.value?.dirty,
    (dirty) => {
      if (dirty) scheduleSave()
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

  return { scheduleSave, cancelScheduledSave }
}
