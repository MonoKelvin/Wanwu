import LogicFlow, { OverlapMode } from '@logicflow/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import {
  DIAGRAM_GRID_SIZE,
  diagramCanvasBackground,
  type DiagramCanvasTheme
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { DIAGRAM_SNAPLINE_EPSILON } from '@modules/library/diagrams/lib/diagramSnapAlign'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  mountDiagramMultiSelectResize,
  type DiagramMultiSelectLayout
} from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import { registerAllDiagramShapes } from '@modules/library/diagrams/lib/diagramShapeRegistry'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import {
  bindDiagramCanvasEvents,
  type DiagramCanvasEventBinderPorts
} from '@modules/library/diagrams/services/bindDiagramCanvasEvents'
import type { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import type { DiagramCanvasThemeCoordinator } from '@modules/library/diagrams/services/diagramCanvasThemeCoordinator'
import type { DiagramCanvasViewportController } from '@modules/library/diagrams/services/diagramCanvasViewportController'
import type { DiagramContextMenuCoordinator } from '@modules/library/diagrams/services/diagramContextMenuCoordinator'
import type { DiagramEdgeInsertCoordinator } from '@modules/library/diagrams/services/diagramEdgeInsertCoordinator'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import type { DiagramFormatPainterCoordinator } from '@modules/library/diagrams/services/diagramFormatPainterCoordinator'
import type { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'
import type { DiagramMultiSelectOverlayCoordinator } from '@modules/library/diagrams/services/diagramMultiSelectOverlayCoordinator'
import type { DiagramSelectionPointerCapture } from '@modules/library/diagrams/services/diagramSelectionPointerCapture'

export interface DiagramEditorMountResult {
  lf: LogicFlow
  teardownCanvasEvents: () => void
  teardownMiddlePan: () => void
  teardownShiftWheelPan: () => void
  teardownContextMenu: () => void
  teardownGroupFrameHover: () => void
  teardownSelectionSnapshot: () => void
  teardownSelectionPointerSync: () => void
  teardownBoxSelectRubberGuard: () => void
  teardownMultiSelectResize: () => void
  refreshMultiSelectResize: () => void
  refreshMultiSelectResizeNow: () => DiagramMultiSelectLayout
}

export interface DiagramEditorMountCoordinatorPorts {
  getContainer(): HTMLElement | null
  setContainer(el: HTMLElement): void
  getCanvasSettings(): DiagramCanvasSettings
  getResolvedTheme(): DiagramCanvasTheme
  canvasTheme: DiagramCanvasThemeCoordinator
  boxSelect: DiagramBoxSelectCoordinator
  viewport: DiagramCanvasViewportController
  groupFrames: DiagramGroupFrameCoordinator
  edgeInsert: DiagramEdgeInsertCoordinator
  selectionBridge: DiagramEditorSelectionBridge
  selectionPointerCapture: DiagramSelectionPointerCapture
  formatPainter: DiagramFormatPainterCoordinator
  contextMenu: DiagramContextMenuCoordinator
  multiSelectOverlay: DiagramMultiSelectOverlayCoordinator
  buildCanvasEventPorts(lf: LogicFlow): DiagramCanvasEventBinderPorts
  bindSelectionPointerSync(el: HTMLElement): () => void
  centerContent(): void
  onViewportChange(): void
  getSelectedContentNodeIds(): string[]
  scheduleGraphChange(): void
  refreshAxisOverlay(): void
  captureDragUndoBaseline(): void
  commitDragUndoMutation(): void
}

/** LogicFlow 实例创建与 DOM 交互绑定 */
export class DiagramEditorMountCoordinator {
  mount(el: HTMLElement, ports: DiagramEditorMountCoordinatorPorts): DiagramEditorMountResult {
    ports.setContainer(el)

    const lf = new LogicFlow({
      container: el,
      grid: { size: DIAGRAM_GRID_SIZE, visible: true, type: 'mesh' },
      snapGrid: false,
      snapline: true,
      snaplineEpsilon: DIAGRAM_SNAPLINE_EPSILON,
      keyboard: { enabled: false },
      history: false,
      edgeType: 'polyline',
      adjustEdgeStartAndEnd: true,
      multipleSelectKey: 'ctrl',
      stopMoveGraph: true,
      stopZoomGraph: true,
      allowResize: true,
      overlapMode: OverlapMode.INCREASE
    })

    registerAllDiagramShapes(lf)
    ensureDiagramShapeExtensions().registerExtensionRenderers(lf)
    ports.canvasTheme.applyCanvasSettings(ports.getCanvasSettings())
    lf.render({ nodes: [], edges: [] })
    ports.canvasTheme.applyBackgroundColor(
      ports.getCanvasSettings().backgroundColor || diagramCanvasBackground(ports.getResolvedTheme())
    )
    ports.refreshAxisOverlay()

    const teardownCanvasEvents = bindDiagramCanvasEvents(ports.buildCanvasEventPorts(lf))
    ports.boxSelect.enableBoxSelection()

    const viewportPorts = {
      getLf: () => lf,
      onViewportChange: () => ports.onViewportChange(),
      onMiddlePanActiveChange: (active: boolean) => ports.boxSelect.setPaused(active),
      centerContent: () => ports.centerContent()
    }
    const teardownMiddlePan = ports.viewport.bindMiddleMousePan(el, viewportPorts)
    const teardownShiftWheelPan = ports.viewport.bindShiftWheelPan(el, viewportPorts)
    const teardownContextMenu = ports.contextMenu.bind(el)
    const teardownGroupFrameHover = ports.groupFrames.bindPointerHover(el)
    const teardownSelectionSnapshot = ports.selectionPointerCapture.bind(el)
    const teardownSelectionPointerSync = ports.bindSelectionPointerSync(el)
    const teardownBoxSelectRubberGuard = ports.boxSelect.bindRubberBandGuard(el)

    const multiSelectResize = mountDiagramMultiSelectResize(
      lf,
      () => {
        ports.groupFrames.syncForNodeIds(ports.getSelectedContentNodeIds())
        ports.scheduleGraphChange()
        ports.selectionBridge.publishSelection()
      },
      (layout) => {
        ports.multiSelectOverlay.syncDomFlags(layout.nodeCount)
        ports.multiSelectOverlay.flushLayout(layout)
      },
      () => ports.groupFrames.syncDuringDrag(undefined, 'fit'),
      el,
      {
        onStart: () => ports.captureDragUndoBaseline(),
        onEnd: () => ports.commitDragUndoMutation()
      }
    )

    return {
      lf,
      teardownCanvasEvents,
      teardownMiddlePan,
      teardownShiftWheelPan,
      teardownContextMenu,
      teardownGroupFrameHover,
      teardownSelectionSnapshot,
      teardownSelectionPointerSync,
      teardownBoxSelectRubberGuard,
      teardownMultiSelectResize: multiSelectResize.destroy,
      refreshMultiSelectResize: multiSelectResize.refresh,
      refreshMultiSelectResizeNow: multiSelectResize.refreshNow
    }
  }
}
