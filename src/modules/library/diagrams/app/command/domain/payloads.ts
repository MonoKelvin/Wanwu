import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'

export interface DiagramFileOpenParams extends IDiagramCommandParams {
  fileId?: string
  templateId?: string
  skipViewport?: boolean
}

export interface DiagramFileSaveParams extends IDiagramCommandParams {
  folderId?: string
  title?: string
  force?: boolean
  auto?: boolean
}

export interface DiagramFileSaveAsParams extends IDiagramCommandParams {
  folderId: string
  title?: string
}

export interface DiagramFileExportParams extends IDiagramCommandParams {
  pageId?: string
  scope?: 'page' | 'all'
  format: 'png' | 'svg' | 'wfg'
}

export interface DiagramFileImportParams extends IDiagramCommandParams {
  discard?: boolean
  folderId?: string
}

export interface DiagramFileCloseParams extends IDiagramCommandParams {
  discard?: boolean
}

export interface DiagramProjectOpenRecentFileParams extends IDiagramCommandParams {
  fileId: string
  skipViewport?: boolean
}

export interface DiagramDocumentAddNodeParams extends IDiagramCommandParams {
  shape: string
  x: number
  y: number
  text?: string
  style?: Record<string, unknown>
  insertEdgeId?: string
}

export interface DiagramDocumentModifyNodeParams extends IDiagramCommandParams {
  nodeId: string
  patch?: Record<string, unknown>
  nodeProps?: Partial<
    import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramNodeProperties
  >
}

export interface DiagramDocumentModifyEdgeParams extends IDiagramCommandParams {
  edgeId: string
  patch?: Record<string, unknown>
  edgeProps?: Partial<
    import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramEdgeProperties
  >
}

export interface DiagramDocumentModifyCanvasSettingsParams extends IDiagramCommandParams {
  settings: Partial<
    import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramCanvasSettings
  >
}

export interface DiagramDocumentBatchModifyNodesParams extends IDiagramCommandParams {
  nodeIds?: string[]
  nodeProps: Partial<
    import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramNodeProperties
  >
}

export interface DiagramDocumentBatchModifyEdgesParams extends IDiagramCommandParams {
  edgeIds?: string[]
  edgeProps: Partial<
    import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramEdgeProperties
  >
}

export interface DiagramDocumentAlignNodesParams extends IDiagramCommandParams {
  mode: import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramAlignMode
  nodeIds?: string[]
}

export interface DiagramDocumentDistributeNodesParams extends IDiagramCommandParams {
  mode: import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramDistributeMode
  nodeIds?: string[]
}

export interface DiagramDocumentDeleteSelectionParams extends IDiagramCommandParams {
  nodeIds?: string[]
  edgeIds?: string[]
}

export interface DiagramDocumentConnectParams extends IDiagramCommandParams {
  sourceNodeId: string
  targetNodeId: string
  style?: Record<string, unknown>
}

export interface DiagramDocumentSelectParams extends IDiagramCommandParams {
  nodeIds: string[]
  edgeIds?: string[]
  append?: boolean
}

export interface DiagramDocumentCopyNodeParams extends IDiagramCommandParams {
  nodeIds?: string[]
  edgeIds?: string[]
}

export interface DiagramDocumentPasteParams extends IDiagramCommandParams {
  x?: number
  y?: number
}

export interface DiagramDocumentGroupParams extends IDiagramCommandParams {
  nodeIds?: string[]
  edgeIds?: string[]
}

export interface DiagramDocumentLayerOrderParams extends IDiagramCommandParams {
  nodeIds?: string[]
}

export interface DiagramDocumentZoomParams extends IDiagramCommandParams {
  delta?: number
  scale?: number
}

export interface DiagramDocumentSetGridParams extends IDiagramCommandParams {
  visible: boolean
  snap?: boolean
}

export type DiagramDocumentNudgeDirection = 'left' | 'right' | 'up' | 'down'

export interface DiagramDocumentNudgeSelectionParams extends IDiagramCommandParams {
  direction: DiagramDocumentNudgeDirection
  large?: boolean
  fine?: boolean
  nodeIds?: string[]
}

export interface DiagramDocumentFinishDragParams extends IDiagramCommandParams {
  beforeGraph: unknown
  afterGraph: unknown
  beforeSelection: { nodeIds: string[]; edgeIds: string[] }
  afterSelection: { nodeIds: string[]; edgeIds: string[] }
}

export interface DiagramPageAddParams extends IDiagramCommandParams {
  name?: string
}

export interface DiagramPageRenameParams extends IDiagramCommandParams {
  pageId: string
  name: string
}

export interface DiagramPageDeleteParams extends IDiagramCommandParams {
  pageId: string
}

export interface DiagramPageDuplicateParams extends IDiagramCommandParams {
  pageId: string
}

export interface DiagramPageReorderParams extends IDiagramCommandParams {
  pageId: string
  sortOrder: number
}

export interface DiagramPageSwitchParams extends IDiagramCommandParams {
  pageId: string
}

export interface DiagramCatalogFileCreateParams extends IDiagramCommandParams {
  folderId: string
  title: string
  content?: DiagramContent
}

export interface DiagramCatalogFileRenameParams extends IDiagramCommandParams {
  fileId: string
  title: string
}

export interface DiagramCatalogFileMoveParams extends IDiagramCommandParams {
  fileId: string
  folderId: string
}

export interface DiagramCatalogFileDuplicateParams extends IDiagramCommandParams {
  fileId: string
}

export interface DiagramCatalogFileSetPinnedParams extends IDiagramCommandParams {
  fileId: string
  pinned: boolean
}

export interface DiagramCatalogFileSoftDeleteParams extends IDiagramCommandParams {
  fileId: string
}

export interface DiagramCatalogFileRestoreParams extends IDiagramCommandParams {
  fileId: string
}

export interface DiagramCatalogFilePurgeParams extends IDiagramCommandParams {
  fileId: string
}

export interface DiagramCatalogFileListParams extends IDiagramCommandParams {
  folderId: string
}

export interface DiagramCatalogFileReadParams extends IDiagramCommandParams {
  fileId: string
}

export interface DiagramCatalogFolderCreateParams extends IDiagramCommandParams {
  name: string
}

export interface DiagramCatalogFolderRenameParams extends IDiagramCommandParams {
  folderId: string
  name: string
}

export interface DiagramCatalogFolderDeleteParams extends IDiagramCommandParams {
  folderId: string
}

export interface DiagramCatalogFolderReorderParams extends IDiagramCommandParams {
  orders: Array<{ folderId: string; sortOrder: number }>
}

/** 命令 ID → 参数类型映射（供 diagramCmd 类型推断） */
export interface DiagramCommandPayloadMap {
  [DiagramCmd.File.Open]: DiagramFileOpenParams
  [DiagramCmd.File.Save]: DiagramFileSaveParams
  [DiagramCmd.File.SaveAs]: DiagramFileSaveAsParams
  [DiagramCmd.File.Reload]: IDiagramCommandParams
  [DiagramCmd.File.Export]: DiagramFileExportParams
  [DiagramCmd.File.ImportWfg]: DiagramFileImportParams
  [DiagramCmd.File.ImportDrawio]: DiagramFileImportParams
  [DiagramCmd.File.Close]: DiagramFileCloseParams
  [DiagramCmd.Project.OpenRecentFile]: DiagramProjectOpenRecentFileParams
  [DiagramCmd.Document.AddNode]: DiagramDocumentAddNodeParams
  [DiagramCmd.Document.ModifyNode]: DiagramDocumentModifyNodeParams
  [DiagramCmd.Document.ModifyEdge]: DiagramDocumentModifyEdgeParams
  [DiagramCmd.Document.ModifyCanvasSettings]: DiagramDocumentModifyCanvasSettingsParams
  [DiagramCmd.Document.BatchModifyNodes]: DiagramDocumentBatchModifyNodesParams
  [DiagramCmd.Document.BatchModifyEdges]: DiagramDocumentBatchModifyEdgesParams
  [DiagramCmd.Document.AlignNodes]: DiagramDocumentAlignNodesParams
  [DiagramCmd.Document.DistributeNodes]: DiagramDocumentDistributeNodesParams
  [DiagramCmd.Document.DeleteSelection]: DiagramDocumentDeleteSelectionParams
  [DiagramCmd.Document.Connect]: DiagramDocumentConnectParams
  [DiagramCmd.Document.Select]: DiagramDocumentSelectParams
  [DiagramCmd.Document.CopyNode]: DiagramDocumentCopyNodeParams
  [DiagramCmd.Document.Paste]: DiagramDocumentPasteParams
  [DiagramCmd.Document.Group]: DiagramDocumentGroupParams
  [DiagramCmd.Document.Ungroup]: IDiagramCommandParams
  [DiagramCmd.Document.BringToFront]: DiagramDocumentLayerOrderParams
  [DiagramCmd.Document.SendToBack]: DiagramDocumentLayerOrderParams
  [DiagramCmd.Document.Zoom]: DiagramDocumentZoomParams
  [DiagramCmd.Document.SetGrid]: DiagramDocumentSetGridParams
  [DiagramCmd.Document.NudgeSelection]: DiagramDocumentNudgeSelectionParams
  [DiagramCmd.Document.FinishDrag]: DiagramDocumentFinishDragParams
  [DiagramCmd.Page.Add]: DiagramPageAddParams
  [DiagramCmd.Page.Rename]: DiagramPageRenameParams
  [DiagramCmd.Page.Delete]: DiagramPageDeleteParams
  [DiagramCmd.Page.Duplicate]: DiagramPageDuplicateParams
  [DiagramCmd.Page.Reorder]: DiagramPageReorderParams
  [DiagramCmd.Page.Switch]: DiagramPageSwitchParams
  [DiagramCmd.Catalog.File.Create]: DiagramCatalogFileCreateParams
  [DiagramCmd.Catalog.File.Rename]: DiagramCatalogFileRenameParams
  [DiagramCmd.Catalog.File.Move]: DiagramCatalogFileMoveParams
  [DiagramCmd.Catalog.File.Duplicate]: DiagramCatalogFileDuplicateParams
  [DiagramCmd.Catalog.File.SetPinned]: DiagramCatalogFileSetPinnedParams
  [DiagramCmd.Catalog.File.SoftDelete]: DiagramCatalogFileSoftDeleteParams
  [DiagramCmd.Catalog.File.Restore]: DiagramCatalogFileRestoreParams
  [DiagramCmd.Catalog.File.Purge]: DiagramCatalogFilePurgeParams
  [DiagramCmd.Catalog.File.List]: DiagramCatalogFileListParams
  [DiagramCmd.Catalog.File.Read]: DiagramCatalogFileReadParams
  [DiagramCmd.Catalog.Folder.Create]: DiagramCatalogFolderCreateParams
  [DiagramCmd.Catalog.Folder.Rename]: DiagramCatalogFolderRenameParams
  [DiagramCmd.Catalog.Folder.Delete]: DiagramCatalogFolderDeleteParams
  [DiagramCmd.Catalog.Folder.Reorder]: DiagramCatalogFolderReorderParams
}
