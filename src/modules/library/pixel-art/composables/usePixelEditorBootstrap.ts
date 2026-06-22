import type { Ref } from 'vue'
import type { PixelEditorSession } from '@modules/library/pixel-art/app/PixelEditorSession'
import type { PixelCanvasEngine } from '@modules/library/pixel-art/services/PixelCanvasEngine'
import type { PixelRepositoryIpcAdapter } from '@modules/library/pixel-art/services/PixelRepositoryIpcAdapter'
import { PIXEL_DEFAULT_SIZE } from '@modules/library/pixel-art/domain/constants'

export async function bootstrapPixelEditor(options: {
  session: PixelEditorSession
  engine: PixelCanvasEngine
  repo: PixelRepositoryIpcAdapter
  fileId: string
  isNewDraft: boolean
  width?: number
  height?: number
}): Promise<void> {
  const w = options.width ?? PIXEL_DEFAULT_SIZE.width
  const h = options.height ?? PIXEL_DEFAULT_SIZE.height
  if (options.isNewDraft) {
    options.session.openBlank(w, h)
  } else {
    await options.session.openFromFile(options.fileId)
  }
}

export function mountPixelCanvas(
  engine: PixelCanvasEngine,
  canvasWrapRef: Ref<HTMLElement | null>,
  theme: 'light' | 'dark'
): void {
  const el = canvasWrapRef.value
  if (!el) return
  engine.mount(el)
  engine.setTheme(theme)
  const rect = el.getBoundingClientRect()
  engine.zoomToFit(rect.width, rect.height)
}
