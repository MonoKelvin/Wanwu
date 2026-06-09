import type { UmlClassifierHit } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierInteraction'

export interface UmlClassifierPanelFocusRequest {
  nodeId: string
  hit: UmlClassifierHit
}
