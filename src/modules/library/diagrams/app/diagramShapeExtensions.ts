import {
  getDiagramShapeExtensionRegistry,
  resetDiagramShapeExtensionRegistry,
  type DiagramShapeExtensionRegistry
} from '@modules/library/diagrams/domain/shape-extension'
import { umlShapeExtension } from '@modules/library/diagrams/extensions'

let bootstrapped = false

/**
 * 组合根：新增领域扩展时仅在此 register 一次。
 * 核心框架（PropertyHost、Bridge、Registry）无需修改。
 */
export function registerBuiltinDiagramShapeExtensions(
  registry: DiagramShapeExtensionRegistry = getDiagramShapeExtensionRegistry()
): void {
  if (bootstrapped) return
  registry.register(umlShapeExtension)
  bootstrapped = true
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
