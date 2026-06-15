import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type {
  DiagramCommandExecutionContext,
  IDiagramAppCommand
} from '@modules/library/diagrams/app/command/DiagramAppCommand'

export type DiagramCommandFactory = (
  params: IDiagramCommandParams | undefined
) => IDiagramAppCommand

export class DiagramCommandRegistry {
  private readonly factories = new Map<DiagramCommandId, DiagramCommandFactory>()
  private readonly singletons = new Map<DiagramCommandId, IDiagramAppCommand>()

  registerSingleton(command: IDiagramAppCommand): this {
    this.singletons.set(command.id, command)
    return this
  }

  registerFactory(id: DiagramCommandId, factory: DiagramCommandFactory): this {
    this.factories.set(id, factory)
    return this
  }

  has(id: string): id is DiagramCommandId {
    return this.singletons.has(id as DiagramCommandId) || this.factories.has(id as DiagramCommandId)
  }

  ids(): DiagramCommandId[] {
    return [...new Set([...this.singletons.keys(), ...this.factories.keys()])]
  }

  async execute(
    id: DiagramCommandId,
    params: IDiagramCommandParams | undefined,
    ctx: DiagramCommandExecutionContext
  ): Promise<DiagramCommandResult> {
    const singleton = this.singletons.get(id)
    if (singleton) return singleton.execute(params, ctx)

    const factory = this.factories.get(id)
    if (!factory) {
      return diagramError('UNKNOWN_COMMAND', `未注册的命令: ${id}`)
    }

    const command = factory(params)
    return command.execute(params, ctx)
  }
}
