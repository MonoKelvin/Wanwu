import type {
  DiagramDocumentFinishDragParams,
  DiagramDocumentFormatPainterApplyParams,
  DiagramDocumentInsertNodeOnEdgeParams
} from '@modules/library/diagrams/app/command/domain/payloads'

/** 画布事件层 → CommandBus 的桥接（拖拽 undo、格式刷、连线拆分等） */
export interface DiagramDocumentCommandBridge {
  finishDrag(payload: DiagramDocumentFinishDragParams): void
  formatPainterApply(payload: DiagramDocumentFormatPainterApplyParams): void
  insertNodeOnEdge(payload: DiagramDocumentInsertNodeOnEdgeParams): void
}
