import { inject, provide, type InjectionKey } from 'vue'

export interface DiagramCanvasClipboardActions {
  copy(): void
  paste(): void
  hasClipboard(): boolean
}

const DIAGRAM_CANVAS_CLIPBOARD = Symbol('diagram-canvas-clipboard') as InjectionKey<DiagramCanvasClipboardActions>

export function provideDiagramCanvasClipboard(actions: DiagramCanvasClipboardActions): void {
  provide(DIAGRAM_CANVAS_CLIPBOARD, actions)
}

export function useDiagramCanvasClipboard(): DiagramCanvasClipboardActions {
  const actions = inject(DIAGRAM_CANVAS_CLIPBOARD)
  if (!actions) throw new Error('DiagramCanvasClipboard 未注入')
  return actions
}
