import {
  getDiagramShapeExtensionRegistry,
  resetDiagramShapeExtensionRegistry,
  type DiagramShapeExtensionRegistry
} from '@modules/library/diagrams/domain/shape-extension'
import { umlShapeExtension, tableShapeExtension } from '@modules/library/diagrams/extensions'

let bootstrapped = false

/**
 * 组合根：新增领域扩展时仅在此 register 一次。
 * 各 kind 通过 resizePolicy / canvasInteractionBinders / contextMenuContributor 声明交互，框架自动聚合。
 */
export function registerBuiltinDiagramShapeExtensions(
  registry: DiagramShapeExtensionRegistry = getDiagramShapeExtensionRegistry()
): void {
  if (bootstrapped) return
  bootstrapped = true
  registry.register(umlShapeExtension)
  registry.register(tableShapeExtension)
}

export function ensureDiagramShapeExtensions(): DiagramShapeExtensionRegistry {
  const registry = getDiagramShapeExtensionRegistry()
  registerBuiltinDiagramShapeExtensions(registry)
  return registry
}

/** 测试 / 热重载：重置组合根注册状态 */
export function resetDiagramShapeExtensions(): void {
  bootstrapped = false
  resetDiagramShapeExtensionRegistry()
}
