import type { DiagramShapePanelFocusApi } from '@modules/library/diagrams/composables/useDiagramShapePanelFocus'
import {
  mapHitToPanelFocus,
  type UmlClassifierHit
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierInteraction'
import type { UmlClassifierPanelFocus } from '@modules/library/diagrams/extensions/uml/composables/useUmlClassifierEditFocus'
import { UML_CLASSIFIER_KIND } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

export function registerBuiltinShapePanelFocusHandlers(
  api: DiagramShapePanelFocusApi,
  options: {
    setUmlPanelFocus: (focus: UmlClassifierPanelFocus | null) => void
    onOpenPropertyPanel?: () => void
  }
): void {
  api.register(UML_CLASSIFIER_KIND, (payload) => {
    options.onOpenPropertyPanel?.()
    options.setUmlPanelFocus(
      mapHitToPanelFocus(payload.nodeId, payload.hit as UmlClassifierHit)
    )
  })
}
