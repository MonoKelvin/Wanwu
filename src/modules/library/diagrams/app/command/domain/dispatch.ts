import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandPayloadMap } from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramCommandEnvelope } from '@modules/library/diagrams/app/command/domain/types'

export function diagramCmd<K extends keyof DiagramCommandPayloadMap>(
  type: K,
  payload: DiagramCommandPayloadMap[K]
): DiagramCommandEnvelope<K>
export function diagramCmd(
  type: DiagramCommandId,
  payload?: IDiagramCommandParams
): DiagramCommandEnvelope
export function diagramCmd(
  type: DiagramCommandId,
  payload?: IDiagramCommandParams
): DiagramCommandEnvelope {
  return {
    type,
    payload
  } as DiagramCommandEnvelope
}

export function diagramCmdEmpty<K extends DiagramCommandId>(type: K): DiagramCommandEnvelope<K> {
  return { type }
}
