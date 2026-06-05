import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'

export class CommandRouter {
  constructor(private readonly handlers: IDiagramCommandHandler[]) {}

  async route(cmd: DiagramCommandEnvelope, ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const handler = this.handlers.find((h) => h.canHandle(cmd.type))
    if (!handler) return diagramError('UNKNOWN_COMMAND', `无处理器: ${cmd.type}`)
    return handler.execute(cmd, ctx)
  }
}
