import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { defaultCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'

function cloneSelection(next: DiagramEditorSelection): DiagramEditorSelection {
  return {
    ...next,
    canvas: { ...next.canvas, defaultEdge: { ...next.canvas.defaultEdge } },
    node: next.node
      ? {
          ...next.node,
          textStyle: { ...next.node.textStyle },
          shapeExtension: next.node.shapeExtension
            ? {
                kind: next.node.shapeExtension.kind,
                data:
                  typeof next.node.shapeExtension.data === 'object' &&
                  next.node.shapeExtension.data !== null
                    ? structuredClone(next.node.shapeExtension.data)
                    : next.node.shapeExtension.data
              }
            : next.node.shapeExtension
        }
      : null,
    edge: next.edge ? { ...next.edge } : null,
    selectedNodeIds: [...next.selectedNodeIds],
    selectedEdgeIds: [...next.selectedEdgeIds],
    mixedNodeFields: [...next.mixedNodeFields]
  }
}

export interface DiagramEditorSelectionApi {
  readonly selection: Readonly<Ref<DiagramEditorSelection>>
  publish(selection: DiagramEditorSelection): void
  reset(resolved?: 'light' | 'dark'): void
}

const selectionKey = Symbol('diagramEditorSelection') as InjectionKey<DiagramEditorSelectionApi>

function emptySelection(resolved: 'light' | 'dark'): DiagramEditorSelection {
  return {
    kind: 'canvas',
    node: null,
    edge: null,
    canvas: defaultCanvasSettings(resolved),
    selectedNodeCount: 0,
    selectedEdgeCount: 0,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    mixedNodeFields: []
  }
}

export function provideDiagramEditorSelection(
  resolved: 'light' | 'dark' = 'light'
): DiagramEditorSelectionApi {
  const selection = ref<DiagramEditorSelection>(emptySelection(resolved))

  const api: DiagramEditorSelectionApi = {
    selection,
    publish(next) {
      selection.value = cloneSelection(next)
    },
    reset(resolvedTheme = 'light') {
      selection.value = emptySelection(resolvedTheme)
    }
  }

  provide(selectionKey, api)
  return api
}

export function useDiagramEditorSelection(): DiagramEditorSelectionApi {
  const api = inject(selectionKey)
  if (!api) {
    throw new Error('useDiagramEditorSelection 需在 provideDiagramEditorSelection 之后使用')
  }
  return api
}
