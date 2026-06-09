import { inject, provide, type InjectionKey } from 'vue'

export interface DiagramEditorGuard {
  flushSave: () => Promise<boolean>
  /** 读取 session 当前页（避免页签 props 滞后导致切换被误判） */
  getActivePageId: () => string | null
}

export const DIAGRAM_EDITOR_GUARD_KEY: InjectionKey<DiagramEditorGuard> = Symbol('diagram-editor-guard')

export function provideDiagramEditorGuard(guard: DiagramEditorGuard): void {
  provide(DIAGRAM_EDITOR_GUARD_KEY, guard)
}

export function useDiagramEditorGuard(): DiagramEditorGuard | null {
  return inject(DIAGRAM_EDITOR_GUARD_KEY, null)
}
