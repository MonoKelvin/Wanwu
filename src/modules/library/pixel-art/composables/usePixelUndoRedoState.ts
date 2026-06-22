import { ref, type Ref } from 'vue'
import type { IPixelEditorPort } from '@modules/library/pixel-art/interfaces/IPixelEditorPort'

export function usePixelUndoRedoState(port: Ref<IPixelEditorPort | null>) {
  const canUndo = ref(false)
  const canRedo = ref(false)

  function refresh() {
    canUndo.value = port.value?.canUndo() ?? false
    canRedo.value = port.value?.canRedo() ?? false
  }

  return { canUndo, canRedo, refresh }
}
