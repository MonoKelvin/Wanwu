import type { Ref } from 'vue'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import { PIXEL_AUTOSAVE_DEBOUNCE_MS } from '@modules/library/pixel-art/domain/constants'

export function usePixelAutosave(sessionRef: Ref<PixelEditorSession | null>) {
  let timer: ReturnType<typeof setTimeout> | null = null

  function scheduleAutosave() {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void flushSave(), PIXEL_AUTOSAVE_DEBOUNCE_MS)
  }

  async function flushSave() {
    const session = sessionRef.value
    if (!session?.dirty || !session.fileId) return
    await session.save()
  }

  function dispose() {
    if (timer) clearTimeout(timer)
  }

  return { scheduleAutosave, flushSave, dispose }
}
