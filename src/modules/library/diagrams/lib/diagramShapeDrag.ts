import {
  DIAGRAM_SHAPE_DRAG_MIME,
  type DiagramShapeDragPayload
} from '@modules/library/diagrams/lib/diagramEditorConstants'

export function isShapeDragEvent(event: Pick<DragEvent, 'dataTransfer'>): boolean {
  const types = event.dataTransfer?.types
  if (!types) return false
  return Array.from(types).includes(DIAGRAM_SHAPE_DRAG_MIME)
}

export function writeShapeDragData(event: DragEvent, payload: DiagramShapeDragPayload): void {
  const json = JSON.stringify(payload)
  event.dataTransfer?.setData(DIAGRAM_SHAPE_DRAG_MIME, json)
  event.dataTransfer?.setData('text/plain', payload.shapeId)
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'copy'
  }
  const el = event.currentTarget
  if (event.dataTransfer && el instanceof HTMLElement) {
    event.dataTransfer.setDragImage(el, el.offsetWidth / 2, el.offsetHeight / 2)
  }
}

export function readShapeDragData(event: DragEvent): DiagramShapeDragPayload | null {
  const raw =
    event.dataTransfer?.getData(DIAGRAM_SHAPE_DRAG_MIME) ||
    event.dataTransfer?.getData('text/plain')
  if (!raw) return null
  try {
    if (raw.startsWith('{')) {
      return JSON.parse(raw) as DiagramShapeDragPayload
    }
    return { shapeId: raw, defaultText: '' }
  } catch {
    return null
  }
}
