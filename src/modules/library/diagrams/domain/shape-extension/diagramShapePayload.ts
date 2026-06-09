import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import { DG_SHAPE_PAYLOAD_KEY } from '@modules/library/diagrams/domain/shape-extension/types'

export function isDiagramShapePayloadEnvelope(
  value: unknown
): value is DiagramShapePayloadEnvelope {
  if (!value || typeof value !== 'object') return false
  const o = value as Record<string, unknown>
  return o.schemaVersion === 1 && typeof o.kind === 'string' && 'data' in o
}

export function readDgShapeFromProperties(
  properties: Record<string, unknown> | undefined
): DiagramShapePayloadEnvelope | null {
  if (!properties) return null
  const raw = properties[DG_SHAPE_PAYLOAD_KEY]
  return isDiagramShapePayloadEnvelope(raw) ? raw : null
}

export function mergeDgShapeIntoProperties(
  properties: Record<string, unknown> | undefined,
  envelope: DiagramShapePayloadEnvelope
): Record<string, unknown> {
  return {
    ...(properties ?? {}),
    [DG_SHAPE_PAYLOAD_KEY]: envelope
  }
}
