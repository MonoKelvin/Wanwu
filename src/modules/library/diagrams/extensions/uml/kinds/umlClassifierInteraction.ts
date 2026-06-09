import type { UmlLayoutHitTarget } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierLayout'
import type { UmlClassifierPanelFocus } from '@modules/library/diagrams/extensions/uml/composables/useUmlClassifierEditFocus'

export type UmlClassifierHit = UmlLayoutHitTarget

export function mapHitToPanelFocus(nodeId: string, hit: UmlClassifierHit): UmlClassifierPanelFocus {
  switch (hit.region) {
    case 'name':
      return { nodeId, region: 'name' }
    case 'attribute':
      return { nodeId, region: 'attribute', memberId: hit.memberId }
    case 'operation':
      return { nodeId, region: 'operation', memberId: hit.memberId }
    case 'attributes-add':
      return { nodeId, region: 'attributes-add' }
    case 'operations-add':
      return { nodeId, region: 'operations-add' }
  }
}
