import type LogicFlow from '@logicflow/core'
import type {
  DiagramShapeExtension,
  DiagramShapeKindRegistration,
  DiagramShapePaletteBinding,
  IDiagramShapePropertyEditorProvider,
  IDiagramShapeRenderer
} from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { isDiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/diagramShapePayload'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import { getDiagramShapeById } from '@modules/library/diagrams/lib/diagramShapeLookup'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

export class DiagramShapeExtensionRegistry {
  private readonly extensions = new Map<string, DiagramShapeExtension>()
  private readonly kinds = new Map<string, DiagramShapeKindRegistration>()
  private readonly lfTypeToKind = new Map<string, string>()
  private readonly paletteBindings = new Map<string, DiagramShapePaletteBinding>()

  register(extension: DiagramShapeExtension): void {
    if (this.extensions.has(extension.id)) {
      throw new Error(`图形扩展包已注册: ${extension.id}`)
    }
    this.extensions.set(extension.id, extension)

    for (const kindReg of extension.kinds) {
      if (this.kinds.has(kindReg.kind)) {
        throw new Error(`图形 kind 已注册: ${kindReg.kind}`)
      }
      this.kinds.set(kindReg.kind, kindReg)
      for (const lfType of kindReg.lfTypes) {
        const prev = this.lfTypeToKind.get(lfType)
        if (prev && prev !== kindReg.kind) {
          throw new Error(`LogicFlow 类型 ${lfType} 已被 kind ${prev} 占用，无法注册 ${kindReg.kind}`)
        }
        this.lfTypeToKind.set(lfType, kindReg.kind)
      }
    }

    for (const binding of extension.paletteBindings ?? []) {
      const prev = this.paletteBindings.get(binding.paletteId)
      if (prev && prev.kind !== binding.kind) {
        throw new Error(
          `图形面板 ${binding.paletteId} 已绑定 kind ${prev.kind}，无法改绑 ${binding.kind}`
        )
      }
      this.paletteBindings.set(binding.paletteId, binding)
    }
  }

  getExtension(id: string): DiagramShapeExtension | undefined {
    return this.extensions.get(id)
  }

  getKind(kind: string): DiagramShapeKindRegistration | undefined {
    return this.kinds.get(kind)
  }

  /** 渲染进程组合根：为已注册的 kind 挂载属性面板 Vue 组件 */
  registerPropertyEditor(kind: string, provider: IDiagramShapePropertyEditorProvider): void {
    const kindReg = this.kinds.get(kind)
    if (!kindReg) {
      throw new Error(`图形 kind 未注册: ${kind}`)
    }
    if (kindReg.propertyEditor) return
    kindReg.propertyEditor = provider
  }

  getKindByLfType(lfType: string): DiagramShapeKindRegistration | undefined {
    const kind = this.lfTypeToKind.get(lfType)
    return kind ? this.kinds.get(kind) : undefined
  }

  getPaletteBinding(paletteId: string): DiagramShapePaletteBinding | undefined {
    return this.paletteBindings.get(paletteId)
  }

  listKinds(): DiagramShapeKindRegistration[] {
    return [...this.kinds.values()]
  }

  listExtensions(): DiagramShapeExtension[] {
    return [...this.extensions.values()]
  }

  /** 拖入画布：根据 paletteId 生成默认 dgShape 信封 */
  createBootstrapEnvelope(paletteId: string): DiagramShapePayloadEnvelope | null {
    const binding = this.paletteBindings.get(paletteId)
    if (!binding) return null

    const kindReg = this.kinds.get(binding.kind)
    if (!kindReg) return null

    const paletteItem = getDiagramShapeById(paletteId)
    const overrides =
      typeof binding.defaultOverrides === 'function'
        ? paletteItem
          ? binding.defaultOverrides(paletteItem)
          : {}
        : binding.defaultOverrides

    const data = kindReg.codec.createDefault(paletteItem, overrides)
    return kindReg.codec.toEnvelope(data)
  }

  /** 注册各扩展声明的 LogicFlow 渲染器（无 renderer 的 kind 沿用内置 regXxx） */
  registerExtensionRenderers(lf: LogicFlow): void {
    const registeredRenderers = new Set<IDiagramShapeRenderer>()
    for (const kindReg of this.kinds.values()) {
      const renderer = kindReg.renderer
      if (!renderer || registeredRenderers.has(renderer)) continue
      renderer.register(lf)
      registeredRenderers.add(renderer)
    }
  }

  /** 加载 graph 后对节点做遗留格式迁移 */
  migrateLegacyNodes(nodes: LogicFlow.NodeConfig[]): LogicFlow.NodeConfig[] {
    return nodes.map((node) => this.migrateLegacyNode(node))
  }

  migrateLegacyNode(node: LogicFlow.NodeConfig): LogicFlow.NodeConfig {
    const props = (node.properties ?? {}) as Record<string, unknown>
    if (isDiagramShapePayloadEnvelope(props.dgShape)) return node

    const kindReg = this.getKindByLfType(String(node.type ?? ''))
    const envelope = kindReg?.codec.migrateLegacyNode?.(node) ?? null

    if (envelope) {
      const text = kindReg?.codec.serializeText?.(envelope.data)
      return {
        ...node,
        ...(text != null ? { text } : {}),
        properties: {
          ...props,
          dgShape: envelope
        }
      }
    }

    if (props.dgShape != null) {
      const { dgShape: _removed, ...rest } = props
      return { ...node, properties: rest }
    }

    return node
  }
}

let registryInstance: DiagramShapeExtensionRegistry | null = null

export function getDiagramShapeExtensionRegistry(): DiagramShapeExtensionRegistry {
  if (!registryInstance) {
    registryInstance = new DiagramShapeExtensionRegistry()
  }
  return registryInstance
}

export function resetDiagramShapeExtensionRegistry(): void {
  registryInstance = null
}
