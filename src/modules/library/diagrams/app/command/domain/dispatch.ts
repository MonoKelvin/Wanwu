import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandPayloadMap } from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramCommandEnvelope } from '@modules/library/diagrams/app/command/domain/types'

/** 构建流程图命令信封；调用方在此处组装具体参数 */
export function diagramCmd<K extends DiagramCommandId>(
  type: K,
  ...args: K extends keyof DiagramCommandPayloadMap
    ? [payload: DiagramCommandPayloadMap[K]]
    : [payload?: IDiagramCommandParams]
): DiagramCommandEnvelope<K> {
  const payload = args[0]
  return {
    type,
    payload: payload as IDiagramCommandParams | undefined
  }
}

export function diagramCmdEmpty<K extends DiagramCommandId>(type: K): DiagramCommandEnvelope<K> {
  return { type }
}
