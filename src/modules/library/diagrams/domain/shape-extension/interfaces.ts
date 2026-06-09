import type { Component } from 'vue'
import type LogicFlow from '@logicflow/core'
import type { DiagramShapeCategory, DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
import type {
  DiagramShapeInteractionMode,
  DiagramShapePayloadEnvelope,
  DiagramShapePropertyEditorOrder
} from '@modules/library/diagrams/domain/shape-extension/types'

/** 结构化载荷编解码 — 每种 kind 必须实现 */
export interface IDiagramShapePayloadCodec<TData = unknown> {
  readonly kind: string

  createDefault(paletteItem?: DiagramShapeItem, overrides?: Partial<TData>): TData

  read(envelope: DiagramShapePayloadEnvelope<TData>): TData

  toEnvelope(data: TData): DiagramShapePayloadEnvelope<TData>

  /** 加载 graph 时从旧格式迁移（无则跳过） */
  migrateLegacyNode?(node: LogicFlow.NodeConfig): DiagramShapePayloadEnvelope<TData> | null

  /** 可选：导出/搜索用纯文本 */
  serializeText?(data: TData): string

  /** 可选：按数据计算节点尺寸 */
  computeLayout?(data: TData, width: number): { width: number; height: number }
}

/** LogicFlow Model/View 注册 */
export interface IDiagramShapeRenderer {
  readonly lfTypes: readonly string[]
  register(lf: LogicFlow): void
}

/** 属性面板 Vue 插件 */
export interface IDiagramShapePropertyEditorProvider {
  readonly kind: string
  readonly order: DiagramShapePropertyEditorOrder
  readonly component: Component
}

/** palette 拖入画布时的默认结构化数据绑定 */
export interface DiagramShapePaletteBinding<TData = unknown> {
  paletteId: string
  kind: string
  defaultOverrides?: Partial<TData> | ((paletteItem: DiagramShapeItem) => Partial<TData>)
}

/** 单种结构化图形（kind）的完整注册项 */
export interface DiagramShapeKindRegistration<TData = unknown> {
  kind: string
  lfTypes: readonly string[]
  interactionMode: DiagramShapeInteractionMode
  codec: IDiagramShapePayloadCodec<TData>
  propertyEditor?: IDiagramShapePropertyEditorProvider
  renderer?: IDiagramShapeRenderer
}

/**
 * 领域扩展包 — 一个模块对应一种场景（uml / table / sequence / bpmn…）
 * 新增领域时：新建 extensions/{domain}/ 并在组合根 register 一次。
 */
export interface DiagramShapeExtension {
  /** 扩展包 id，如 'uml'、'table' */
  readonly id: string
  readonly label: string
  readonly kinds: readonly DiagramShapeKindRegistration[]
  readonly paletteBindings?: readonly DiagramShapePaletteBinding[]
  /** 可选：向图形面板贡献 catalog 分类（未来替代手写 catalog） */
  readonly catalogCategories?: readonly DiagramShapeCategory[]
}
