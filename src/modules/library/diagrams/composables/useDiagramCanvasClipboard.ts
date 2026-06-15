import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import { inject, provide, type InjectionKey } from 'vue'

export interface DiagramCanvasClipboardActions {
  copy(): void
  paste(): void
  hasClipboard(): boolean
}

const DIAGRAM_CANVAS_CLIPBOARD = Symbol('diagram-canvas-clipboard') as InjectionKey<DiagramCanvasClipboardActions>

/** 剪贴板操作经画布命令；hasClipboard 读画布状态 */
export function createDiagramCanvasClipboardActions(
  copy: () => void,
  paste: () => void,
  getPort: () => LogicFlowDiagramAdapter | null
): DiagramCanvasClipboardActions {
  return {
    copy,
    paste,
    hasClipboard: () => getPort()?.hasClipboard() ?? false
  }
}

export function provideDiagramCanvasClipboard(actions: DiagramCanvasClipboardActions): void {
  provide(DIAGRAM_CANVAS_CLIPBOARD, actions)
}

export function useDiagramCanvasClipboard(): DiagramCanvasClipboardActions {
  const actions = inject(DIAGRAM_CANVAS_CLIPBOARD)
  if (!actions) throw new Error('DiagramCanvasClipboard 未注入')
  return actions
}
