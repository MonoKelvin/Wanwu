import type { DiagramCommandContext, DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import { castDiagramParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { TransactionManager } from '@app/transaction'
import type { IDiagramRepositoryPort } from '@modules/library/diagrams/interfaces/IDiagramRepositoryPort'

export interface DiagramCommandExecutionContext {
  command: DiagramCommandContext
  session: DiagramEditorSession | null
  port: LogicFlowDiagramAdapter | null
  tx: TransactionManager | null
  repo: IDiagramRepositoryPort
}

export interface IDiagramAppCommand {
  readonly id: DiagramCommandId
  readonly title: string
  /** 是否在命令内部开启/提交事务 */
  readonly usesTransaction: boolean
  execute(
    params: IDiagramCommandParams | undefined,
    ctx: DiagramCommandExecutionContext
  ): Promise<DiagramCommandResult>
}

/** @deprecated 使用 DiagramDataCommandBase */
export abstract class DiagramAppCommandBase implements IDiagramAppCommand {
  abstract readonly id: DiagramCommandId
  abstract readonly title: string
  readonly usesTransaction: boolean = false

  protected castParams<P extends IDiagramCommandParams>(params: IDiagramCommandParams | undefined): P {
    return (params ?? {}) as P
  }

  abstract execute(
    params: IDiagramCommandParams | undefined,
    ctx: DiagramCommandExecutionContext
  ): Promise<DiagramCommandResult>
}

export { castDiagramParams }
