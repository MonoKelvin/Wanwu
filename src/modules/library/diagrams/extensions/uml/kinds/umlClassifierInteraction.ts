import {
  computeUmlClassifierLayout,
  type UmlLayoutHitTarget
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierLayout'
import type { UmlClassifierPanelFocus } from '@modules/library/diagrams/extensions/uml/composables/useUmlClassifierEditFocus'
import type { UmlClassifierData } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

export type UmlClassifierHit = UmlLayoutHitTarget & {
  lineText?: string
}

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

/** 将画布坐标转为节点内局部坐标（原点在节点中心，Y 向下） */
export function canvasPointToNodeLocal(
  canvasX: number,
  canvasY: number,
  nodeX: number,
  nodeY: number
): { x: number; y: number } {
  return { x: canvasX - nodeX, y: canvasY - nodeY }
}

/** 节点局部坐标 → 距顶边的距离 */
export function localToTopOffset(localX: number, localY: number, height: number): { top: number; x: number } {
  return { top: localY + height / 2, x: localX + 0 /* width handled by caller */ }
}

export function hitTestUmlClassifier(
  data: UmlClassifierData,
  width: number,
  height: number,
  canvasX: number,
  canvasY: number,
  nodeX: number,
  nodeY: number
): UmlClassifierHit | null {
  const localY = canvasY - nodeY + height / 2
  const layout = computeUmlClassifierLayout(data, width)

  for (const line of layout.renderLines) {
    if (!line.hit || line.hitTop == null || line.hitHeight == null) continue
    const top = line.hitTop
    const bottom = top + line.hitHeight
    if (localY >= top && localY < bottom) {
      return { ...line.hit, lineText: line.text }
    }
  }
  return null
}
