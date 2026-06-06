import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

const STORAGE_KEY = 'dg-editor-panel-collapse'

export type DiagramEditorLayoutState = {
  assetCollapsed: Ref<boolean>
  propsCollapsed: Ref<boolean>
}

const DIAGRAM_EDITOR_LAYOUT_KEY: InjectionKey<DiagramEditorLayoutState> = Symbol('diagramEditorLayout')

function readStoredCollapse(): { asset: boolean; props: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { asset: false, props: false }
    const parsed = JSON.parse(raw) as { asset?: boolean; props?: boolean }
    return { asset: Boolean(parsed.asset), props: Boolean(parsed.props) }
  } catch {
    return { asset: false, props: false }
  }
}

function persistCollapse(asset: boolean, props: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ asset, props }))
  } catch {
    /* ignore */
  }
}

export function provideDiagramEditorLayout(): DiagramEditorLayoutState {
  const stored = readStoredCollapse()
  const assetCollapsed = ref(stored.asset)
  const propsCollapsed = ref(stored.props)

  const state: DiagramEditorLayoutState = { assetCollapsed, propsCollapsed }
  provide(DIAGRAM_EDITOR_LAYOUT_KEY, state)
  return state
}

export function useDiagramEditorLayout(): DiagramEditorLayoutState {
  const state = inject(DIAGRAM_EDITOR_LAYOUT_KEY)
  if (!state) {
    throw new Error('useDiagramEditorLayout must be used under provideDiagramEditorLayout')
  }
  return state
}

export function toggleAssetPanelCollapsed(state: DiagramEditorLayoutState): void {
  state.assetCollapsed.value = !state.assetCollapsed.value
  persistCollapse(state.assetCollapsed.value, state.propsCollapsed.value)
}

export function togglePropsPanelCollapsed(state: DiagramEditorLayoutState): void {
  state.propsCollapsed.value = !state.propsCollapsed.value
  persistCollapse(state.assetCollapsed.value, state.propsCollapsed.value)
}
