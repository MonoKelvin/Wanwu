import {
  registerDiagramPropertyPanel,
  resetDiagramPropertyPanelBootstrap
} from '@modules/library/diagrams/app/diagramPropertyPanelBootstrap'
import { resetDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import { resetDiagramShapeExtensionUi } from '@modules/library/diagrams/app/diagramShapeExtensionUi'

/** 渲染进程 UI 组合根：属性面板区块 + 图形扩展 UI */
export function registerDiagramEditorUi(): void {
  registerDiagramPropertyPanel()
}

/** 测试 / HMR：重置全部 UI 注册状态与 registry 单例 */
export function resetDiagramEditorUiBootstrap(): void {
  resetDiagramPropertyPanelBootstrap()
  resetDiagramShapeExtensions()
  resetDiagramShapeExtensionUi()
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    resetDiagramEditorUiBootstrap()
  })
  import.meta.hot.accept(() => {
    registerDiagramEditorUi()
  })
}
