import type { IDiagramCommandBus, DiagramCommandBatchOptions } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/app/command/domain/types'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { DiagramRegistryCommandHandler } from '@modules/library/diagrams/app/command/DiagramRegistryCommandHandler'
import { registerDiagramCommands } from '@modules/library/diagrams/app/command/registerDiagramCommands'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'
import type { TransactionManager } from '@app/transaction'
import { getCommandRuntime } from '@app/bootstrap/commandRuntimeStore'
import { diagramEnvelopeToCommand } from '@modules/library/diagrams/app/command/DiagramCommandContributor'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'

export interface CreateDiagramCommandBusOptions {
  getSession: () => DiagramEditorSession | null
  getPort?: () => LogicFlowDiagramAdapter | null
  getTransactionManager?: () => TransactionManager | null
  repo: IDiagramRepositoryPort
  handlers?: IDiagramCommandHandler[]
}

class DiagramCommandBus implements IDiagramCommandBus {
  private readonly handler: IDiagramCommandHandler
  private readonly getSession: () => DiagramEditorSession | null
  private readonly getTransactionManager?: () => TransactionManager | null
  private readonly listeners = new Set<
    (cmd: DiagramCommandEnvelope, result: DiagramCommandResult) => void
  >()

  constructor(
    handler: IDiagramCommandHandler,
    getSession: () => DiagramEditorSession | null,
    getTransactionManager?: () => TransactionManager | null
  ) {
    this.handler = handler
    this.getSession = getSession
    this.getTransactionManager = getTransactionManager
  }

  private buildContext(): DiagramCommandContext {
    const session = this.getSession()
    return {
      sessionId: session?.sessionId ?? null,
      fileId: session?.fileId ?? null,
      activePageId: session?.activePageId ?? null
    }
  }

  private async route(cmd: DiagramCommandEnvelope, ctx: DiagramCommandContext): Promise<DiagramCommandResult> {
    if (!this.handler.canHandle(cmd.type)) {
      return diagramError('UNKNOWN_COMMAND', `无处理器: ${cmd.type}`)
    }
    return this.handler.execute(cmd, ctx)
  }

  async dispatch(cmd: DiagramCommandEnvelope): Promise<DiagramCommandResult> {
    const result = await this.route(cmd, this.buildContext())
    for (const listener of this.listeners) listener(cmd, result)

    const runtime = getCommandRuntime()
    if (runtime) {
      void runtime.manager.dispatch(
        diagramEnvelopeToCommand(cmd),
        { scopeId: 'module:diagrams', services: {} },
        { record: result.ok })
    }

    return result
  }

  async dispatchBatch(
    cmds: DiagramCommandEnvelope[],
    options?: DiagramCommandBatchOptions
  ): Promise<DiagramCommandResult[]> {
    const stopOnError = options?.stopOnError !== false
    const tx = this.getTransactionManager?.() ?? null

    const runBatch = async (): Promise<DiagramCommandResult[]> => {
      const results: DiagramCommandResult[] = []
      for (const cmd of cmds) {
        const result = await this.dispatch(cmd)
        results.push(result)
        if (stopOnError && !result.ok) break
      }
      return results
    }

    if (!tx || cmds.length === 0) {
      return runBatch()
    }

    const batchResult = await tx.runInTransaction('批量命令', async () => {
      const results = await runBatch()
      const failed = results.find((r) => !r.ok)
      if (failed && !failed.ok) {
        return { ok: false as const, code: failed.code, message: failed.message }
      }
      return { ok: true as const, data: results }
    })

    if (!batchResult.ok) {
      return [{ ok: false, code: 'INTERNAL', message: batchResult.message }]
    }
    return batchResult.data ?? []
  }

  onResult(handler: (cmd: DiagramCommandEnvelope, result: DiagramCommandResult) => void): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }
}

export function createDiagramCommandBus(options: CreateDiagramCommandBusOptions): IDiagramCommandBus {
  const registry = registerDiagramCommands({
    getSession: options.getSession,
    getTransactionManager: options.getTransactionManager,
    repo: options.repo
  })
  const handlers = options.handlers ?? [
    new DiagramRegistryCommandHandler(
      registry,
      options.getSession,
      () => options.getTransactionManager?.() ?? null,
      options.repo,
      options.getPort
    )
  ]
  return new DiagramCommandBus(handlers[0]!, options.getSession, options.getTransactionManager)
}
