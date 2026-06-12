import type LogicFlow from '@logicflow/core'
import type { DiagramCanvasTheme } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import {
  clearEdgeStyle,
  clearNodeStyle
} from '@modules/library/diagrams/lib/diagramStyleClipboard'

export interface DiagramSelectionStyleCoordinatorPorts {
  getLf(): LogicFlow | null
  getResolvedTheme(): DiagramCanvasTheme
  getSelectedNodeIds(): string[]
  getSelectedEdgeIds(): string[]
  syncGroupFramesForNodes(nodeIds: string[]): void
  refreshGroupFramesDisplay(): void
  scheduleGraphChange(): void
  publishSelection(): void
}

/** 选区样式：清除节点/边样式并刷新组合框 */
export class DiagramSelectionStyleCoordinator {
  constructor(private readonly ports: DiagramSelectionStyleCoordinatorPorts) {}

  clearSelectionStyles(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const nodeIds = this.ports.getSelectedNodeIds()
    const edgeIds = this.ports.getSelectedEdgeIds()
    const theme = this.ports.getResolvedTheme()
    for (const id of nodeIds) {
      clearNodeStyle(lf, id, theme)
    }
    if (nodeIds.length) {
      this.ports.syncGroupFramesForNodes(nodeIds)
    }
    for (const id of edgeIds) {
      clearEdgeStyle(lf, id, theme)
    }
    this.ports.refreshGroupFramesDisplay()
    this.ports.scheduleGraphChange()
    this.ports.publishSelection()
  }
}
