import { diagramCmd, diagramCmdEmpty } from '@modules/library/diagrams/app/command/domain/dispatch'
import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandEnvelope, DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'

/** UI 命令运行时依赖（toast / 确认框等），由 Vue 层注入 */
export interface DiagramUiRuntime {
  toast?: {
    success(message: string): void
    error(message: string): void
    info(message: string): void
  }
  confirm?: (options: {
    header: string
    message: string
    acceptLabel: string
    rejectLabel: string
  }) => Promise<boolean>
}

/**
 * UI 命令基类：组合「数据命令 + UI 副作用」。
 * 不注册到 Registry；由组件 / composable 显式调用 run()。
 */
export abstract class DiagramUiCommandBase<TParams = void> {
  /** 组合的数据命令 ID */
  abstract readonly dataCommandId: DiagramCommandId

  protected buildPayload(_params: TParams): IDiagramCommandParams | undefined {
    return undefined
  }

  protected buildEnvelope(params: TParams): DiagramCommandEnvelope {
    const payload = this.buildPayload(params)
    if (payload === undefined) {
      return diagramCmdEmpty(this.dataCommandId)
    }
    return diagramCmd(this.dataCommandId, payload)
  }

  protected abstract afterDataSuccess(
    result: Extract<DiagramCommandResult, { ok: true }>,
    params: TParams,
    ui: DiagramUiRuntime
  ): void | Promise<void>

  protected afterDataError(
    result: Extract<DiagramCommandResult, { ok: false }>,
    _params: TParams,
    ui: DiagramUiRuntime
  ): void | Promise<void> {
    if (result.message && result.code !== 'VALIDATION' && result.code !== 'CANCELED') {
      ui.toast?.error(result.message)
    }
  }

  async run(
    bus: IDiagramCommandBus,
    params: TParams,
    ui: DiagramUiRuntime
  ): Promise<DiagramCommandResult> {
    const result = await bus.dispatch(this.buildEnvelope(params))
    if (result.ok) {
      await this.afterDataSuccess(result, params, ui)
    } else {
      await this.afterDataError(result, params, ui)
    }
    return result
  }
}
