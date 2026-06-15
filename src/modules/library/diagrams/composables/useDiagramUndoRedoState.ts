import { onBeforeUnmount, ref, watch, type Ref } from 'vue'
import type { TransactionManager } from '@app/transaction'
import { useDiagramTransactionManager } from '@modules/library/diagrams/composables/useDiagramTransactionManager'

export interface DiagramUndoRedoState {
  canUndo: Ref<boolean>
  canRedo: Ref<boolean>
  undoLabel: Ref<string | null>
  redoLabel: Ref<string | null>
}

export function useDiagramUndoRedoState(): DiagramUndoRedoState {
  const txRef = useDiagramTransactionManager()
  const canUndo = ref(false)
  const canRedo = ref(false)
  const undoLabel = ref<string | null>(null)
  const redoLabel = ref<string | null>(null)

  function syncFrom(tx: TransactionManager | null): void {
    canUndo.value = tx?.canUndo() ?? false
    canRedo.value = tx?.canRedo() ?? false
    undoLabel.value = tx?.undoLabel() ?? null
    redoLabel.value = tx?.redoLabel() ?? null
  }

  let unsubscribe: (() => void) | null = null

  watch(
    txRef,
    (tx) => {
      unsubscribe?.()
      unsubscribe = null
      syncFrom(tx)
      if (!tx) return
      unsubscribe = tx.onChange((event) => {
        canUndo.value = event.canUndo
        canRedo.value = event.canRedo
        undoLabel.value = event.undoLabel
        redoLabel.value = event.redoLabel
      })
    },
    { immediate: true })

  onBeforeUnmount(() => unsubscribe?.())

  return { canUndo, canRedo, undoLabel, redoLabel }
}
