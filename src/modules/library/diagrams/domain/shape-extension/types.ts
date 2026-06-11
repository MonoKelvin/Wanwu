/** 图形扩展载荷信封 — 存于 node.properties.dgShape */
export interface DiagramShapePayloadEnvelope<TData = unknown> {
  schemaVersion: 1
  /** 全局唯一 kind，建议 `{extensionId}.{shapeName}`，如 uml.classifier */
  kind: string
  data: TData
}

/** 图形交互模式 — 决定编辑/渲染/持久化策略 */
export type DiagramShapeInteractionMode =
  /** 单 LogicFlow 节点承载全部语义（UML 类、表格单元等） */
  | 'node'
  /** 多节点/边协同（时序图 lifeline + message） */
  | 'composite'
  /** 画布片段/子图（复杂领域场景） */
  | 'fragment'

/** 属性面板中扩展编辑器的插入位置 */
export type DiagramShapePropertyEditorOrder =
  | 'before-common'
  | 'after-common'
  | 'replace-text'

export const DG_SHAPE_PAYLOAD_KEY = 'dgShape' as const
