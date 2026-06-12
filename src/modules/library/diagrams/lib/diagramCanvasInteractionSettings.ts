import type LogicFlow from '@logicflow/core'

/** 画布交互开关（缩放吸附等），由 Adapter 在加载/变更 canvasSettings 时同步 */
let snapGridEnabled = true

export function setDiagramCanvasSnapGrid(enabled: boolean): void {
  snapGridEnabled = enabled
}

export function getDiagramCanvasSnapGrid(): boolean {
  return snapGridEnabled
}

let viewportChangeNotify: (() => void) | null = null

export function setDiagramViewportChangeNotify(handler: (() => void) | null): void {
  viewportChangeNotify = handler
}

export function notifyDiagramViewportChange(): void {
  viewportChangeNotify?.()
}

let activeLogicFlow: LogicFlow | null = null

export function setDiagramActiveLogicFlow(lf: LogicFlow | null): void {
  activeLogicFlow = lf
}

export function getDiagramActiveLogicFlow(): LogicFlow | null {
  return activeLogicFlow
}
