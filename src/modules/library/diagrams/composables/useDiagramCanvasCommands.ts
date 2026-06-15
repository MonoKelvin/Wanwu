import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type {
  DiagramDocumentAddNodeParams,
  DiagramDocumentAlignNodesParams,
  DiagramDocumentBatchModifyEdgesParams,
  DiagramDocumentBatchModifyNodesParams,
  DiagramDocumentDistributeNodesParams,
  DiagramDocumentFinishDragParams,
  DiagramDocumentFormatPainterApplyParams,
  DiagramDocumentInsertNodeOnEdgeParams,
  DiagramDocumentModifyCanvasSettingsParams,
  DiagramDocumentModifyEdgeParams,
  DiagramDocumentModifyNodeParams,
  DiagramDocumentNudgeDirection
} from '@modules/library/diagrams/app/command/domain/payloads'
import { createDiagramDataCommandApi } from '@modules/library/diagrams/composables/useDiagramDataCommand'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

export type DiagramDocumentMutationCommands = Pick<
  DiagramCanvasCommands,
  | 'modifyNode'
  | 'modifyNodeAsync'
  | 'modifyEdge'
  | 'batchModifyNodes'
  | 'batchModifyEdges'
  | 'modifyCanvasSettings'
>

export type DiagramCanvasCommands = ReturnType<typeof createDiagramCanvasCommands>

/** 画布文档类数据命令的语义化封装（无 UI 副作用） */
export function createDiagramCanvasCommands(bus: IDiagramCommandBus) {
  const { fire, fireEmpty, fireTyped, dispatch, dispatchEmpty, dispatchTyped } =
    createDiagramDataCommandApi(bus)

  return {
    undo: () => fireEmpty(DiagramCmd.Document.Undo),
    redo: () => fireEmpty(DiagramCmd.Document.Redo),
    copy: () => fireEmpty(DiagramCmd.Document.CopyNode),
    paste: (coords?: { x?: number; y?: number }) =>
      coords ? fire(DiagramCmd.Document.Paste, coords) : fireEmpty(DiagramCmd.Document.Paste),
    deleteSelection: (payload?: { nodeIds?: string[]; edgeIds?: string[] }) =>
      fire(DiagramCmd.Document.DeleteSelection, payload ?? {}),
    selectAll: () => fireEmpty(DiagramCmd.Document.SelectAll),
    clearSelection: () => fireEmpty(DiagramCmd.Document.ClearSelection),
    group: () => fireEmpty(DiagramCmd.Document.Group),
    ungroup: () => fireEmpty(DiagramCmd.Document.Ungroup),
    zoom: (delta: number) => fire(DiagramCmd.Document.Zoom, { delta }),
    zoomToFit: () => dispatchEmpty(DiagramCmd.Document.ZoomToFit),
    zoomReset: () => fireEmpty(DiagramCmd.Document.ZoomReset),
    centerOrigin: () => fireEmpty(DiagramCmd.Document.CenterOrigin),
    centerContent: () => fireEmpty(DiagramCmd.Document.CenterContent),
    formatPainterStart: () => fireEmpty(DiagramCmd.Document.FormatPainterStart),
    formatPainterCancel: () => fireEmpty(DiagramCmd.Document.FormatPainterCancel),
    clearStyles: () => fireEmpty(DiagramCmd.Document.ClearStyles),
    nudgeSelection: (direction: DiagramDocumentNudgeDirection, opts?: { large?: boolean; fine?: boolean }) =>
      fire(DiagramCmd.Document.NudgeSelection, { direction, ...opts }),
    alignNodes: (mode: DiagramDocumentAlignNodesParams['mode'], nodeIds?: string[]) =>
      fire(DiagramCmd.Document.AlignNodes, { mode, nodeIds }),
    distributeNodes: (mode: DiagramDocumentDistributeNodesParams['mode'], nodeIds?: string[]) =>
      fire(DiagramCmd.Document.DistributeNodes, { mode, nodeIds }),
    bringToFront: (nodeIds: string[]) => fire(DiagramCmd.Document.BringToFront, { nodeIds }),
    sendToBack: (nodeIds: string[]) => fire(DiagramCmd.Document.SendToBack, { nodeIds }),
    addNode: (payload: DiagramDocumentAddNodeParams) => fireTyped(DiagramCmd.Document.AddNode, payload),
    modifyNode: (payload: DiagramDocumentModifyNodeParams) =>
      fireTyped(DiagramCmd.Document.ModifyNode, payload),
    modifyNodeAsync: (payload: DiagramDocumentModifyNodeParams) =>
      dispatchTyped(DiagramCmd.Document.ModifyNode, payload),
    modifyEdge: (payload: DiagramDocumentModifyEdgeParams) =>
      fireTyped(DiagramCmd.Document.ModifyEdge, payload),
    batchModifyNodes: (payload: DiagramDocumentBatchModifyNodesParams) =>
      fireTyped(DiagramCmd.Document.BatchModifyNodes, payload),
    batchModifyEdges: (payload: DiagramDocumentBatchModifyEdgesParams) =>
      fireTyped(DiagramCmd.Document.BatchModifyEdges, payload),
    modifyCanvasSettings: (payload: DiagramDocumentModifyCanvasSettingsParams) =>
      fireTyped(DiagramCmd.Document.ModifyCanvasSettings, payload),
    finishDrag: (payload: DiagramDocumentFinishDragParams) =>
      void dispatch(DiagramCmd.Document.FinishDrag, payload),
    formatPainterApply: (payload: DiagramDocumentFormatPainterApplyParams) =>
      void dispatch(DiagramCmd.Document.FormatPainterApply, payload),
    insertNodeOnEdge: (payload: DiagramDocumentInsertNodeOnEdgeParams) =>
      void dispatch(DiagramCmd.Document.InsertNodeOnEdge, payload),
    pagePrev: () => dispatchEmpty(DiagramCmd.Page.Prev),
    pageNext: () => dispatchEmpty(DiagramCmd.Page.Next),
    dispatch,
    dispatchEmpty
  }
}

export function useDiagramCanvasCommands() {
  return createDiagramCanvasCommands(useDiagramCommandBus())
}
