import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramShapeExtensionRegistry } from '@modules/library/diagrams/domain/shape-extension'
import { registerUmlShapeExtensionUi } from '@modules/library/diagrams/extensions/uml/umlShapeExtensionUi'

let uiBootstrapped = false

/** 渲染进程组合根：挂载扩展属性面板（避免主进程构建引入 .vue） */
export function registerDiagramShapeExtensionUi(
  registry: DiagramShapeExtensionRegistry = ensureDiagramShapeExtensions()
): void {
  if (uiBootstrapped) return
  registerUmlShapeExtensionUi(registry)
  uiBootstrapped = true
}

/** 测试 / 热重载：重置 UI 注册状态 */
export function resetDiagramShapeExtensionUi(): void {
  uiBootstrapped = false
}
