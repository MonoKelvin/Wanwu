import { onUnmounted, watch, type Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'

export function useDiagramAutosave(options: {
  bus: IDiagramCommandBus
  session: Ref<DiagramEditorSession | null>
  debounceMs?: number
  isBlocked?: () => boolean
  onSaveError?: (message: string) => void
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
    if (!session?.dirty) return

    saving = true
    try {
      const result = await options.bus.dispatch({ type: 'document.save' })
      if (!result.ok && result.code !== 'CONFLICT') {
        options.onSaveError?.(result.message ?? '自动保存失败')
      }
    } finally {
      saving = false
    }
  }

  function scheduleSave() {
    if (options.isBlocked?.()) return
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

  const stopFile = watch(
    () => options.session.value?.fileId,
    () => cancelScheduledSave()
  )

  onUnmounted(() => {
    stopDirty()
    stopFile()
    cancelScheduledSave()
  })

  return { scheduleSave, cancelScheduledSave }
}
