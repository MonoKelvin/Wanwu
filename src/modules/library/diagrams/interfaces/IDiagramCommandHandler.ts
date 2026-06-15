import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/app/command/domain/types'

export interface IDiagramCommandHandler {
  readonly domain: 'diagram'
  canHandle(type: string): boolean
  execute(cmd: DiagramCommandEnvelope, ctx: DiagramCommandContext): Promise<DiagramCommandResult>
}
