import { onUnmounted, watch, type Ref } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'

export function useDiagramAutosave(options: {
  bus: IDiagramCommandBus
  session: Ref<DiagramEditorSession | null>
  debounceMs?: number
}) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounceMs = options.debounceMs ?? 1500

  function scheduleSave() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      const session = options.session.value
      if (!session?.dirty || !session.fileId) return
      void options.bus.dispatch({ type: 'document.save' })
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
    () => {
      if (timer) clearTimeout(timer)
    }
  )

  onUnmounted(() => {
    stopDirty()
    stopFile()
    if (timer) clearTimeout(timer)
  })

  return { scheduleSave }
}
