import { inject, provide, type InjectionKey } from 'vue'

export interface DiagramEditorGuard {
  flushSave: () => Promise<boolean>
}

export const DIAGRAM_EDITOR_GUARD_KEY: InjectionKey<DiagramEditorGuard> = Symbol('diagram-editor-guard')

export function provideDiagramEditorGuard(guard: DiagramEditorGuard): void {
  provide(DIAGRAM_EDITOR_GUARD_KEY, guard)
}

export function useDiagramEditorGuard(): DiagramEditorGuard | null {
  return inject(DIAGRAM_EDITOR_GUARD_KEY, null)
}
