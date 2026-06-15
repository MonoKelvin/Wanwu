import type LogicFlow from '@logicflow/core'
import { countSelectedDiagramNodes } from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import {
  canGroupFromLiveSelection,
  countSelectedEdges,
  selectionHasGroupedElements
} from '@modules/library/diagrams/lib/diagramGroupSelection'
import { resolveGroupFrameIdForElement } from '@modules/library/diagrams/lib/diagramGroupFrame'
import type { DiagramSelectionCapabilities } from '@modules/library/diagrams/domain/composeDiagramEditorSelection'

export interface DiagramSelectionCapabilityPorts {
  /** 剪贴板/右键菜单目标解析（LogicFlow 适配器提供） */
  resolveClipboardTargets?(
    nodeIds: readonly string[],
    edgeIds: readonly string[]
  ): { nodeIds: string[]; edgeIds: string[] }
}

/**
 * 由选区 id 列表解析工具栏能力（组合/拆组）。
 * 与多选 overlay、剪贴板目标对齐，供 composeDiagramEditorSelection 注入。
 */
export function resolveSelectionCapabilities(
  lf: LogicFlow,
  nodeIds: readonly string[],
  edgeIds: readonly string[],
  ports: DiagramSelectionCapabilityPorts = {}
): DiagramSelectionCapabilities {
  const nodes = [...nodeIds]
  const edges = [...edgeIds]

  let canGroup = canGroupFromLiveSelection(lf, nodes, edges)
  if (!canGroup) {
    const overlayNodes = countSelectedDiagramNodes(lf.graphModel, lf)
    const edgeCount = Math.max(edges.length, countSelectedEdges(lf))
    if (overlayNodes + edgeCount >= 2) {
      canGroup = true
    } else if (ports.resolveClipboardTargets) {
      const resolved = ports.resolveClipboardTargets(nodes, edges)
      canGroup = resolved.nodeIds.length + resolved.edgeIds.length >= 2
    }
  }

  let canUngroup = selectionHasGroupedElements(lf, nodes, edges)
  if (!canUngroup && ports.resolveClipboardTargets) {
    const resolved = ports.resolveClipboardTargets(nodes, edges)
    for (const id of resolved.nodeIds) {
      if (resolveGroupFrameIdForElement(lf, id, 'node')) {
        canUngroup = true
        break
      }
    }
    if (!canUngroup) {
      for (const id of resolved.edgeIds) {
        if (resolveGroupFrameIdForElement(lf, id, 'edge')) {
          canUngroup = true
          break
        }
      }
    }
  }

  return { canGroup, canUngroup }
}
