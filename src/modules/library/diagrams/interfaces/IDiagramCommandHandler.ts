import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'

export interface IDiagramCommandHandler {
  readonly domain: 'canvas' | 'page' | 'document' | 'file' | 'folder'
  canHandle(type: string): boolean
  execute(cmd: DiagramCommandEnvelope, ctx: DiagramCommandContext): Promise<DiagramCommandResult>
}
