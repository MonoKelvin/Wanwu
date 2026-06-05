import type {
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'

export interface DiagramCommandBatchOptions {
  stopOnError?: boolean
}

export interface IDiagramCommandBus {
  dispatch(cmd: DiagramCommandEnvelope): Promise<DiagramCommandResult>
  dispatchBatch(
    cmds: DiagramCommandEnvelope[],
    options?: DiagramCommandBatchOptions
  ): Promise<DiagramCommandResult[]>
  onResult(handler: (cmd: DiagramCommandEnvelope, result: DiagramCommandResult) => void): () => void
}

export const DIAGRAM_COMMAND_BUS = Symbol('diagram-command-bus')
