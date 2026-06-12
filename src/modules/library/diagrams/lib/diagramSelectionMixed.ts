import type LogicFlow from '@logicflow/core'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { readNodeProperties } from '@modules/library/diagrams/lib/diagramStyleBridge'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'

type MixedGetter = (node: DiagramNodeProperties) => unknown

const MIXED_NODE_CHECKS: Array<{ field: string; get: MixedGetter }> = [
  { field: 'fill', get: (n) => n.fill },
  { field: 'stroke', get: (n) => n.stroke },
  { field: 'strokeWidth', get: (n) => n.strokeWidth },
  { field: 'strokeDasharray', get: (n) => n.strokeDasharray ?? '' },
  { field: 'textStyle.fontSize', get: (n) => n.textStyle.fontSize },
  { field: 'textStyle.fontFamily', get: (n) => n.textStyle.fontFamily },
  { field: 'textStyle.color', get: (n) => n.textStyle.color },
  { field: 'textStyle.textAlign', get: (n) => n.textStyle.textAlign },
  { field: 'textStyle.fontWeight', get: (n) => n.textStyle.fontWeight },
  { field: 'shadow', get: (n) => n.shadow }
]

/** 多选图元时，各字段值不一致则列入 mixed 列表 */
export function computeMixedNodeFields(
  lf: LogicFlow,
  nodeIds: string[]
): string[] {
  if (nodeIds.length < 2) return []

  const props = nodeIds
    .map((id) => {
      const model = lf.getNodeModelById(id)
      if (!model || isGroupFrameModel(model)) return null
      return readNodeProperties(lf, id)
    })
    .filter(Boolean) as DiagramNodeProperties[]

  if (props.length < 2) return []

  const mixed: string[] = []
  for (const { field, get } of MIXED_NODE_CHECKS) {
    const base = get(props[0]!)
    if (props.some((p) => get(p) !== base)) {
      mixed.push(field)
    }
  }
  return mixed
}
