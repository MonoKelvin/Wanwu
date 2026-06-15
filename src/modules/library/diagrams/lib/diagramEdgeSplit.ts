import type LogicFlow from '@logicflow/core'
import {
  buildSplitEdgeConfigs,
  type DiagramEdgeInsertNode
} from '@modules/library/diagrams/lib/diagramEdgeInsert'

/** 将节点插入连线并拆分为两条边 */
export function splitEdgeAtNode(lf: LogicFlow, nodeId: string, edgeId: string): boolean {
  const edge = lf.getEdgeModelById(edgeId)
  if (!edge) return false
  const sourceNodeId = edge.sourceNodeId
  const targetNodeId = edge.targetNodeId
  if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return false
  if (nodeId === sourceNodeId || nodeId === targetNodeId) return false

  const insertModel = lf.getNodeModelById(nodeId)
  const sourceModel = lf.getNodeModelById(sourceNodeId)
  const targetModel = lf.getNodeModelById(targetNodeId)
  if (!insertModel || !sourceModel || !targetModel) return false

  const [firstEdge, secondEdge] = buildSplitEdgeConfigs(
    {
      type: edge.type,
      sourceNodeId,
      targetNodeId,
      properties: structuredClone(edge.properties ?? {}) as Record<string, unknown>,
      text: edge.text
    },
    insertModel as DiagramEdgeInsertNode,
    sourceModel as DiagramEdgeInsertNode,
    targetModel as DiagramEdgeInsertNode
  )

  lf.deleteEdge(edgeId)
  lf.addEdge(firstEdge as never)
  lf.addEdge(secondEdge as never)
  return true
}
