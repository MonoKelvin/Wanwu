import type { IDiagramCommandBus, DiagramCommandBatchOptions } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type { IDiagramCommandHandler } from '@modules/library/diagrams/interfaces/IDiagramCommandHandler'
import type {
  DiagramCommandContext,
  DiagramCommandEnvelope,
  DiagramCommandResult
} from '@modules/library/diagrams/domain/commands/types'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { CommandRouter } from './CommandRouter'
import { CanvasCommandHandler } from './handlers/CanvasCommandHandler'
import { DocumentCommandHandler } from './handlers/DocumentCommandHandler'
import { FileCommandHandler } from './handlers/FileCommandHandler'
import { FolderCommandHandler } from './handlers/FolderCommandHandler'
import { PageCommandHandler } from './handlers/PageCommandHandler'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'

export interface CreateDiagramCommandBusOptions {
  getSession: () => DiagramEditorSession | null
  repo: IDiagramRepositoryPort
  handlers?: IDiagramCommandHandler[]
}

class DiagramCommandBus implements IDiagramCommandBus {
  private readonly router: CommandRouter
  private readonly getSession: () => DiagramEditorSession | null
  private readonly listeners = new Set<
    (cmd: DiagramCommandEnvelope, result: DiagramCommandResult) => void
  >()

  constructor(router: CommandRouter, getSession: () => DiagramEditorSession | null) {
    this.router = router
    this.getSession = getSession
  }

  private buildContext(): DiagramCommandContext {
    const session = this.getSession()
    return {
      sessionId: session?.sessionId ?? null,
      fileId: session?.fileId ?? null,
      activePageId: session?.activePageId ?? null
    }
  }

  async dispatch(cmd: DiagramCommandEnvelope): Promise<DiagramCommandResult> {
    const result = await this.router.route(cmd, this.buildContext())
    for (const listener of this.listeners) listener(cmd, result)
    return result
  }

  async dispatchBatch(
    cmds: DiagramCommandEnvelope[],
    options?: DiagramCommandBatchOptions
  ): Promise<DiagramCommandResult[]> {
    const stopOnError = options?.stopOnError !== false
    const results: DiagramCommandResult[] = []
    for (const cmd of cmds) {
      const result = await this.dispatch(cmd)
      results.push(result)
      if (stopOnError && !result.ok) break
    }
    return results
  }

  onResult(handler: (cmd: DiagramCommandEnvelope, result: DiagramCommandResult) => void): () => void {
    this.listeners.add(handler)
    return () => this.listeners.delete(handler)
  }
}

export function createDiagramCommandBus(options: CreateDiagramCommandBusOptions): IDiagramCommandBus {
  const handlers = options.handlers ?? [
    new CanvasCommandHandler(options.getSession),
    new PageCommandHandler(options.getSession),
    new DocumentCommandHandler(options.getSession),
    new FileCommandHandler(options.repo),
    new FolderCommandHandler(options.repo)
  ]
  const router = new CommandRouter(handlers)
  return new DiagramCommandBus(router, options.getSession)
}
