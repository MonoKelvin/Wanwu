import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

export type UmlClassifierPanelFocus =
  | { nodeId: string; region: 'name' }
  | { nodeId: string; region: 'attribute'; memberId: string }
  | { nodeId: string; region: 'operation'; memberId: string }
  | { nodeId: string; region: 'attributes-add' }
  | { nodeId: string; region: 'operations-add' }

const UML_EDIT_FOCUS_KEY: InjectionKey<{
  panelFocus: Ref<UmlClassifierPanelFocus | null>
  setPanelFocus: (focus: UmlClassifierPanelFocus | null) => void
}> = Symbol('umlClassifierEditFocus')

export function provideUmlClassifierEditFocus() {
  const panelFocus = ref<UmlClassifierPanelFocus | null>(null)
  const api = {
    panelFocus,
    setPanelFocus(focus: UmlClassifierPanelFocus | null) {
      panelFocus.value = focus
    }
  }
  provide(UML_EDIT_FOCUS_KEY, api)
  return api
}

export function useUmlClassifierEditFocus() {
  const ctx = inject(UML_EDIT_FOCUS_KEY)
  if (!ctx) {
    return {
      panelFocus: ref<UmlClassifierPanelFocus | null>(null),
      setPanelFocus: () => {}
    }
  }
  return ctx
}
