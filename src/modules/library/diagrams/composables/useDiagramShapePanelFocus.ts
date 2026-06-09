import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'
import type { DiagramShapeHitPayload } from '@modules/library/diagrams/domain/shape-extension/types'

export type DiagramShapePanelFocusHandler = (payload: DiagramShapeHitPayload) => void

export interface DiagramShapePanelFocusApi {
  register(kind: string, handler: DiagramShapePanelFocusHandler): () => void
  route(payload: DiagramShapeHitPayload): void
  clear(): void
  activeFocus: Ref<{ nodeId: string; kind: string } | null>
}

const DIAGRAM_SHAPE_PANEL_FOCUS_KEY: InjectionKey<DiagramShapePanelFocusApi> = Symbol(
  'diagramShapePanelFocus'
)

export function provideDiagramShapePanelFocus(): DiagramShapePanelFocusApi {
  const handlers = new Map<string, DiagramShapePanelFocusHandler>()
  const activeFocus = ref<{ nodeId: string; kind: string } | null>(null)

  const api: DiagramShapePanelFocusApi = {
    activeFocus,
    register(kind, handler) {
      handlers.set(kind, handler)
      return () => handlers.delete(kind)
    },
    route(payload) {
      handlers.get(payload.kind)?.(payload)
      activeFocus.value = { nodeId: payload.nodeId, kind: payload.kind }
    },
    clear() {
      activeFocus.value = null
    }
  }

  provide(DIAGRAM_SHAPE_PANEL_FOCUS_KEY, api)
  return api
}

export function useDiagramShapePanelFocus(): DiagramShapePanelFocusApi {
  const ctx = inject(DIAGRAM_SHAPE_PANEL_FOCUS_KEY)
  if (!ctx) {
    return {
      activeFocus: ref(null),
      register: () => () => {},
      route: () => {},
      clear: () => {}
    }
  }
  return ctx
}
