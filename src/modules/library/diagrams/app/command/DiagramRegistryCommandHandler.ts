import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/app/command/domain/types'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { TransactionManager } from '@app/transaction'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import type { DiagramCommandRegistry } from '@modules/library/diagrams/app/command/DiagramCommandRegistry'
import { DiagramUndoRedoCoordinator } from '@modules/library/diagrams/app/transaction/DiagramUndoRedoCoordinator'
import { isDiagramCommandId, DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'

export class DiagramRegistryCommandHandler implements IDiagramCommandHandler {
  readonly domain = 'diagram' as const
  private readonly undoRedoCoordinator = new DiagramUndoRedoCoordinator()

  constructor(
    private readonly registry: DiagramCommandRegistry,
    private readonly getSession: () => DiagramEditorSession | null,
    private readonly getTransactionManager: () => TransactionManager | null,
    private readonly repo: IDiagramRepositoryPort,
    private readonly getPort?: () => LogicFlowDiagramAdapter | null
  ) {}

  canHandle(type: string): boolean {
    return isDiagramCommandId(type)
  }

  async execute(cmd: DiagramCommandEnvelope, ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    const session = this.getSession()
    const port =
      (this.getPort?.() as LogicFlowDiagramAdapter | null | undefined) ??
      (session?.editorPort as LogicFlowDiagramAdapter | null | undefined)

    const execCtx = {
      command: ctx,
      session: session ?? null,
      port: port ?? null,
      tx: this.getTransactionManager(),
      repo: this.repo
    }

    try {
      if (cmd.type === DiagramCmd.Document.Undo || cmd.type === DiagramCmd.Document.Redo) {
        const op = await this.undoRedoCoordinator.run(async () => {
          const result = await this.registry.execute(cmd.type, cmd.payload, execCtx)
          if (!result.ok) {
            return { ok: false as const, code: 'TX_REVERT_FAILED', message: result.message }
          }
          return { ok: true as const }
        })
        if (!op.ok) return diagramError('INTERNAL', op.message ?? '撤销/重做失败')
        return { ok: true }
      }

      return await this.registry.execute(cmd.type, cmd.payload, execCtx)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return diagramError('INTERNAL', message)
    }
  }
}
