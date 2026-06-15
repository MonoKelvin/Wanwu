import type { Router } from 'vue-router'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import { DG_HOME, DG_RECYCLE } from '@modules/library/diagrams/domain/diagramFolderIds'
import { LIBRARY_DIAGRAMS_EDITOR_ROUTE } from '@modules/library/diagrams/domain/diagramRoutes'

/** 数据命令成功后的全局 UI 联动（选区刷新、路由、视口等），与具体数据命令解耦 */
export interface DiagramCommandUiBridgeDeps {
  bus: IDiagramCommandBus
  router: Router
  getPort: () => LogicFlowDiagramAdapter | null
  getFileId: () => string
  getFolderId: () => string | undefined
  publishSelection: () => void
  bumpSessionView: () => void
  refreshViewportZoom: () => void
  syncAfterPageCommand: () => void
}

export function bindDiagramCommandUiBridge(deps: DiagramCommandUiBridgeDeps): () => void {
  return deps.bus.onResult((cmd, result) => {
    if (!result.ok) return

    if (
      cmd.type === DiagramCmd.Document.Select ||
      cmd.type === DiagramCmd.Document.SelectAll ||
      cmd.type === DiagramCmd.Document.ClearSelection
    ) {
      deps.publishSelection()
    }

    if (
      cmd.type === DiagramCmd.Document.Undo ||
      cmd.type === DiagramCmd.Document.Redo ||
      cmd.type === DiagramCmd.Document.ModifyNode ||
      cmd.type === DiagramCmd.Document.BatchModifyNodes
    ) {
      deps.publishSelection()
    }

    if (
      cmd.type === DiagramCmd.File.Save ||
      cmd.type === DiagramCmd.File.SaveAs ||
      cmd.type === DiagramCmd.File.ImportWfg ||
      cmd.type === DiagramCmd.File.ImportDrawio
    ) {
      if (cmd.type === DiagramCmd.File.Save || cmd.type === DiagramCmd.File.SaveAs) {
        deps.bumpSessionView()
      }
      const data = result.data as { meta?: { id: string } } | undefined
      const id = data?.meta?.id ?? (data as { fileId?: string } | undefined)?.fileId
      if (id && id !== deps.getFileId()) {
        const folderId = deps.getFolderId()
        const query: Record<string, string> = {}
        if (folderId && folderId !== DG_HOME && folderId !== DG_RECYCLE) {
          query.folderId = folderId
        }
        if (cmd.type === DiagramCmd.File.ImportWfg || cmd.type === DiagramCmd.File.ImportDrawio) {
          query.fitView = '1'
        }
        void deps.router.replace({
          name: LIBRARY_DIAGRAMS_EDITOR_ROUTE,
          params: { fileId: id },
          query
        })
      }
    }

    if (
      cmd.type === DiagramCmd.Document.Zoom ||
      cmd.type === DiagramCmd.Document.ZoomToFit ||
      cmd.type === DiagramCmd.Document.ZoomReset ||
      cmd.type === DiagramCmd.Document.CenterContent ||
      cmd.type === DiagramCmd.File.Open ||
      cmd.type === DiagramCmd.File.ImportWfg ||
      cmd.type === DiagramCmd.File.ImportDrawio ||
      cmd.type.startsWith('Diagram.Page.')
    ) {
      if (cmd.type.startsWith('Diagram.Page.')) {
        deps.syncAfterPageCommand()
      } else {
        deps.refreshViewportZoom()
      }
      if (
        (cmd.type === DiagramCmd.File.Open ||
          cmd.type === DiagramCmd.File.ImportWfg ||
          cmd.type === DiagramCmd.File.ImportDrawio) &&
        deps.getPort()
      ) {
        deps.bumpSessionView()
        deps.publishSelection()
      }
    }
  })
}
