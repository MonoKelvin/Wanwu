/** 流程图模块命令唯一 ID（PascalCase 分段，点号分类） */
export const DiagramCmd = {
  File: {
    Open: 'Diagram.File.Open',
    Save: 'Diagram.File.Save',
    SaveAs: 'Diagram.File.SaveAs',
    Reload: 'Diagram.File.Reload',
    Export: 'Diagram.File.Export',
    ImportWfg: 'Diagram.File.ImportWfg',
    ImportDrawio: 'Diagram.File.ImportDrawio',
    Close: 'Diagram.File.Close'
  },
  Project: {
    OpenRecentFile: 'Diagram.Project.OpenRecentFile'
  },
  Document: {
    AddNode: 'Diagram.Document.AddNode',
    ModifyNode: 'Diagram.Document.ModifyNode',
    ModifyEdge: 'Diagram.Document.ModifyEdge',
    ModifyCanvasSettings: 'Diagram.Document.ModifyCanvasSettings',
    BatchModifyNodes: 'Diagram.Document.BatchModifyNodes',
    BatchModifyEdges: 'Diagram.Document.BatchModifyEdges',
    AlignNodes: 'Diagram.Document.AlignNodes',
    DistributeNodes: 'Diagram.Document.DistributeNodes',
    DeleteSelection: 'Diagram.Document.DeleteSelection',
    Connect: 'Diagram.Document.Connect',
    Select: 'Diagram.Document.Select',
    SelectAll: 'Diagram.Document.SelectAll',
    ClearSelection: 'Diagram.Document.ClearSelection',
    CopyNode: 'Diagram.Document.CopyNode',
    Paste: 'Diagram.Document.Paste',
    Group: 'Diagram.Document.Group',
    Ungroup: 'Diagram.Document.Ungroup',
    BringToFront: 'Diagram.Document.BringToFront',
    SendToBack: 'Diagram.Document.SendToBack',
    Undo: 'Diagram.Document.Undo',
    Redo: 'Diagram.Document.Redo',
    Zoom: 'Diagram.Document.Zoom',
    ZoomToFit: 'Diagram.Document.ZoomToFit',
    ZoomReset: 'Diagram.Document.ZoomReset',
    CenterContent: 'Diagram.Document.CenterContent',
    CenterOrigin: 'Diagram.Document.CenterOrigin',
    SetGrid: 'Diagram.Document.SetGrid',
    NudgeSelection: 'Diagram.Document.NudgeSelection',
    FormatPainterStart: 'Diagram.Document.FormatPainterStart',
    FormatPainterCancel: 'Diagram.Document.FormatPainterCancel',
    ClearStyles: 'Diagram.Document.ClearStyles',
    /** 内部：拖拽结束提交 undo 栈 */
    FinishDrag: 'Diagram.Document.FinishDrag'
  },
  Page: {
    Add: 'Diagram.Page.Add',
    Rename: 'Diagram.Page.Rename',
    Delete: 'Diagram.Page.Delete',
    Duplicate: 'Diagram.Page.Duplicate',
    Reorder: 'Diagram.Page.Reorder',
    Switch: 'Diagram.Page.Switch',
    Prev: 'Diagram.Page.Prev',
    Next: 'Diagram.Page.Next'
  },
  Catalog: {
    File: {
      Create: 'Diagram.Catalog.File.Create',
      Rename: 'Diagram.Catalog.File.Rename',
      Move: 'Diagram.Catalog.File.Move',
      Duplicate: 'Diagram.Catalog.File.Duplicate',
      SetPinned: 'Diagram.Catalog.File.SetPinned',
      SoftDelete: 'Diagram.Catalog.File.SoftDelete',
      Restore: 'Diagram.Catalog.File.Restore',
      Purge: 'Diagram.Catalog.File.Purge',
      List: 'Diagram.Catalog.File.List',
      Read: 'Diagram.Catalog.File.Read'
    },
    Folder: {
      Create: 'Diagram.Catalog.Folder.Create',
      Rename: 'Diagram.Catalog.Folder.Rename',
      Delete: 'Diagram.Catalog.Folder.Delete',
      Reorder: 'Diagram.Catalog.Folder.Reorder',
      List: 'Diagram.Catalog.Folder.List'
    }
  }
} as const

function collectCommandIds(node: object): string[] {
  const ids: string[] = []
  for (const value of Object.values(node)) {
    if (typeof value === 'string') ids.push(value)
    else if (value && typeof value === 'object') ids.push(...collectCommandIds(value))
  }
  return ids
}

export const ALL_DIAGRAM_COMMAND_IDS = collectCommandIds(DiagramCmd) as readonly string[]

export type DiagramCommandId = (typeof ALL_DIAGRAM_COMMAND_IDS)[number]

export function isDiagramCommandId(type: string): type is DiagramCommandId {
  return (ALL_DIAGRAM_COMMAND_IDS as readonly string[]).includes(type)
}

export function diagramCommandCategory(id: DiagramCommandId): string {
  if (id.startsWith('Diagram.Document.')) return '流程图/画布'
  if (id.startsWith('Diagram.Page.')) return '流程图/页面'
  if (id.startsWith('Diagram.File.')) return '流程图/文件'
  if (id.startsWith('Diagram.Project.')) return '流程图/项目'
  if (id.startsWith('Diagram.Catalog.File.')) return '流程图/库文件'
  if (id.startsWith('Diagram.Catalog.Folder.')) return '流程图/库分组'
  return '流程图'
}

const TITLE_MAP: Partial<Record<DiagramCommandId, string>> = {
  [DiagramCmd.Document.Undo]: '撤销',
  [DiagramCmd.Document.Redo]: '重做',
  [DiagramCmd.Document.ZoomToFit]: '适应画布',
  [DiagramCmd.Document.DeleteSelection]: '删除选中',
  [DiagramCmd.Document.CopyNode]: '复制',
  [DiagramCmd.Document.Paste]: '粘贴',
  [DiagramCmd.Document.AlignNodes]: '对齐',
  [DiagramCmd.Document.DistributeNodes]: '分布',
  [DiagramCmd.File.Save]: '保存',
  [DiagramCmd.File.Open]: '打开'
}

export function diagramCommandTitle(id: DiagramCommandId): string {
  return TITLE_MAP[id] ?? id.split('.').slice(-1)[0] ?? id
}
