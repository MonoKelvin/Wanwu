import type { Component } from 'vue'
import type LogicFlow from '@logicflow/core'
import type {
  DiagramContextMenuContributor,
  DiagramShapeCanvasInteractionBinder
} from '@modules/library/diagrams/domain/shape-extension/canvasInteractionTypes'
import type { DiagramShapeResizePolicy } from '@modules/library/diagrams/domain/shape-extension/resizePolicyTypes'
import type { DiagramShapeCategory, DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
import type {
  DiagramShapeInteractionMode,
  DiagramShapePayloadEnvelope,
  DiagramShapePropertyEditorOrder
} from '@modules/library/diagrams/domain/shape-extension/types'

/** 节点属性 / dgShape patch 后的扩展生命周期上下文 */
export type DiagramShapeNodePatchContext = {
  lf: LogicFlow
  nodeId: string
  /** dgShape 写入完成时携带 */
  envelope?: DiagramShapePayloadEnvelope
  source: 'dgShape' | 'nodeProperties'
}

/** 扩展在节点 patch 后清理瞬时交互、刷新自定义 View 等 */
export type DiagramShapeNodePatchHook = (ctx: DiagramShapeNodePatchContext) => void

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

  /**
   * 属性更新时是否同步 LogicFlow 内置 text。
   * 自定义 View 自行绘制文本时应为 false，避免多余重绘。
   */
  readonly syncLfText?: boolean

  /** Model.setAttributes 已处理布局时，bridge 跳过重复 layout */
  readonly layoutHandledByModel?: boolean

  /** layoutHandledByModel 时 dgShape 更新后同步 LF Model 尺寸（扩展自管布局逻辑） */
  syncLayoutToModel?(model: unknown, data: TData): void

  /** 可选：按数据计算节点尺寸 */
  computeLayout?(data: TData, width: number): { width: number; height: number; minWidth?: number; minHeight?: number }
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
  /** order 为 replace-text 时覆盖通用「文本」区块标题 */
  readonly textSectionTitle?: string
}

/** 属性面板区块策略 — 扩展声明与通用区块的共存方式 */
export interface DiagramPropertySectionPolicy {
  /** 扩展区块排序，默认 100 */
  extensionOrder?: number
  /** 隐藏通用区块子项 */
  hideSections?: Partial<Record<'node-text-content' | 'node-text', true>>
  textSectionTitle?: string
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
  propertyPanelPolicy?: DiagramPropertySectionPolicy
  renderer?: IDiagramShapeRenderer
  /** 缩放锚点策略（默认四角） */
  resizePolicy?: DiagramShapeResizePolicy
  /** kind 级画布 DOM 交互 */
  canvasInteractionBinders?: readonly DiagramShapeCanvasInteractionBinder[]
  /** kind 级右键菜单 */
  contextMenuContributor?: DiagramContextMenuContributor
  /** dgShape 或节点 properties 变更后的生命周期钩子 */
  onNodePatched?: DiagramShapeNodePatchHook
}

/** 图形扩展注册表抽象 — 组合根注册扩展包与属性编辑器 */
export interface IDiagramShapeExtensionRegistry {
  register(extension: DiagramShapeExtension): void
  getKind(kind: string): DiagramShapeKindRegistration | undefined
  getKindByLfType(lfType: string): DiagramShapeKindRegistration | undefined
  registerPropertyEditor(kind: string, provider: IDiagramShapePropertyEditorProvider): void
  getPaletteBinding(paletteId: string): DiagramShapePaletteBinding | undefined
  listKinds(): DiagramShapeKindRegistration[]
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
  /** 可选：画布 DOM 交互（双击编辑、拖拽分割线等） */
  readonly canvasInteractionBinders?: readonly DiagramShapeCanvasInteractionBinder[]
  /** 可选：画布右键菜单项 */
  readonly contextMenuContributor?: DiagramContextMenuContributor
}
