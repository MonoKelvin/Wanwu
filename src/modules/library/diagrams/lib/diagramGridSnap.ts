import {
  softSnapCoordinate,
  snapCoordinateToGrid
} from '@modules/library/diagrams/lib/diagramCanvasTheme'

export {
  applyDragSnapOnDrop,
  applyResizeAlignSnap,
  cancelResizeAlignGuide,
  cancelResizeSnapFeedback,
  collectSnapMoveIds,
  finishResizeAlignSnap,
  refreshResizeAlignGuide,
  scheduleResizeAlignGuide,
  scheduleResizeSnapFeedback,
  refreshSnapAlignGuide,
  snapNodesAfterDrag,
  softAlignNodesDuringDrag,
  softSnapNodesDuringDrag,
  type AlignmentGrabRatios,
  type AlignmentPointerContext
} from '@modules/library/diagrams/lib/diagramDragSnap'

export {
  computeGrabRatiosFromPointer,
  readAlignmentPointerFromClient,
  readAlignmentPointerFromDragEvent
} from '@modules/library/diagrams/lib/diagramSnapAlign'

export { DIAGRAM_SOFT_SNAP_THRESHOLD } from '@modules/library/diagrams/lib/diagramCanvasTheme'

export function snapCanvasPoint(
  x: number,
  y: number,
  enabled: boolean
): { x: number; y: number } {
  if (!enabled) return { x, y }
  return {
    x: snapCoordinateToGrid(x),
    y: snapCoordinateToGrid(y)
  }
}

export { softSnapCoordinate, snapCoordinateToGrid }
