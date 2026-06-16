export type { DiagramResizeHandleDir } from '@modules/library/diagrams/lib/diagramResizeBounds'

/** 图形 kind 可声明的缩放策略 — 框架读取，扩展包注册 */
export interface DiagramShapeResizePolicy {
  /** 可见锚点，默认四角 */
  handles?: readonly import('@modules/library/diagrams/lib/diagramResizeBounds').DiagramResizeHandleDir[]
  /** 锚点相对角点内缩（px），避免遮挡外围操作控件 */
  handleInset?: number
}
