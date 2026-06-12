import type LogicFlow from '@logicflow/core'
import {
  pickDiagramElementAtClient,
  pickDiagramElementFromDom
} from '@modules/library/diagrams/lib/diagramCanvasHitTest'
import type { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'

export type DiagramContextMenuHandler = (detail: {
  event: MouseEvent
  kind: 'node' | 'edge' | 'blank'
  targetId?: string
  nodeIds: string[]
  edgeIds: string[]
}) => void

export interface DiagramContextMenuCoordinatorPorts {
  getLf(): LogicFlow | null
  getHandler(): DiagramContextMenuHandler | null
  cancelFormatPainter(): void
  boxSelect: DiagramBoxSelectCoordinator
  selectionBridge: DiagramEditorSelectionBridge
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
}

/** 画布右键菜单：命中检测与选区预处理 */
export class DiagramContextMenuCoordinator {
  constructor(private readonly ports: DiagramContextMenuCoordinatorPorts) {}

  bind(el: HTMLElement): () => void {
    const onContextMenu = (event: MouseEvent) => {
      const lf = this.ports.getLf()
      const handler = this.ports.getHandler()
      if (!lf || !handler) return
      event.preventDefault()
      event.stopPropagation()
      this.ports.cancelFormatPainter()
      this.ports.boxSelect.restoreCollapsedBoxSelection()
      const domPick = pickDiagramElementFromDom(lf, event.target)
      const picked =
        domPick ??
        pickDiagramElementAtClient(lf, event.clientX, event.clientY, (x, y) =>
          this.ports.clientToCanvas(x, y)
        )
      if ((picked.kind === 'node' || picked.kind === 'edge') && picked.targetId) {
        this.applySelection({ kind: picked.kind, targetId: picked.targetId }, event)
      } else if (picked.kind === 'blank') {
        const live = this.ports.selectionBridge.collectLiveSelectedIds()
        if (!live.nodeIds.length && !live.edgeIds.length) {
          lf.clearSelectElements()
        }
      }
      this.ports.selectionBridge.syncFromGraph()
      const live = this.ports.selectionBridge.collectLiveSelectedIds()
      handler({
        event,
        kind: picked.kind,
        targetId: picked.targetId,
        nodeIds: live.nodeIds,
        edgeIds: live.edgeIds
      })
    }
    el.addEventListener('contextmenu', onContextMenu, true)
    return () => el.removeEventListener('contextmenu', onContextMenu, true)
  }

  private applySelection(
    picked: { kind: 'node' | 'edge'; targetId: string },
    event: MouseEvent
  ): void {
    const lf = this.ports.getLf()
    if (!lf) return
    this.ports.boxSelect.restoreCollapsedBoxSelection()
    const live = this.ports.selectionBridge.collectLiveSelectedIds()
    const nodeIds = live.nodeIds
    const edgeIds = live.edgeIds
    const totalSelected = nodeIds.length + edgeIds.length
    const alreadySelected =
      picked.kind === 'node'
        ? nodeIds.includes(picked.targetId)
        : edgeIds.includes(picked.targetId)
    const append = Boolean(event.ctrlKey || event.metaKey || event.shiftKey)

    if (totalSelected > 1 && alreadySelected && !append) return

    if (append && alreadySelected) {
      lf.deselectElementById(picked.targetId)
      return
    }

    if (!append) {
      lf.clearSelectElements()
    }
    lf.selectElementById(picked.targetId, append && totalSelected > 0)
  }
}
