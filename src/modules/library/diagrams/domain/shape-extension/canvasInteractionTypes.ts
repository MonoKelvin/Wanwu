import type LogicFlow from '@logicflow/core'

/** 扩展画布交互所需的最小 Port — 完整 Port 可向上兼容 */
export interface DiagramShapeCanvasInteractionPorts {
  getLf(): LogicFlow
  getContainer(): HTMLElement | null
  scheduleGraphChange(): void
  /** 扩展拦截了 LF 点击时，手动推送选区以刷新属性面板与图元 Tab */
  notifyUserSelectionChange(): void
  /** 强制从 LF 当前选区推送快照到属性面板 */
  publishSelection(): void
  /** 与 node:click 等价的单选推送（表格单元格点击用） */
  selectNodeForPropertyPanel(nodeId: string, event?: PointerEvent): void
  captureDragUndoBaseline(): void
  commitDragUndoMutation(): void
  clearDragUndoBaseline(): void
}

export type DiagramShapeCanvasInteractionBinder = (
  ports: DiagramShapeCanvasInteractionPorts
) => () => void

/** 扩展贡献的右键菜单项（与 WwMenuItem 结构兼容） */
export type DiagramExtensionMenuItem = {
  label?: string
  separator?: boolean
  disabled?: boolean
  command?: () => void
  wwIcon?: string
  shortcut?: string
}

export type DiagramContextMenuContributionContext = {
  targetKind: 'node' | 'edge' | 'blank'
  nodeIds: string[]
  edgeIds: string[]
  event?: MouseEvent
  getLf(): LogicFlow | null
  modifyNode(nodeId: string, patch: Record<string, unknown>): void
}

export type DiagramContextMenuContributor = (
  ctx: DiagramContextMenuContributionContext
) => DiagramExtensionMenuItem[]
