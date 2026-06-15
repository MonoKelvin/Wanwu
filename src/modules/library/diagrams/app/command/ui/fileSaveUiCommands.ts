import { DiagramUiCommandBase, type DiagramUiRuntime } from '@modules/library/diagrams/app/command/ui/DiagramUiCommand'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type {
  DiagramFileSaveAsParams,
  DiagramFileSaveParams
} from '@modules/library/diagrams/app/command/domain/payloads'
import type { DiagramFileCommands } from '@modules/library/diagrams/composables/useDiagramFileCommands'

/** PrimeVue toast → DiagramUiRuntime */
export function adaptPrimeToast(toast: { add: (msg: object) => void }): DiagramUiRuntime {
  return {
    toast: {
      success: (message) => toast.add({ severity: 'success', summary: message, life: 2000 }),
      error: (message) => toast.add({ severity: 'error', summary: message, life: 4000 }),
      info: (message) => toast.add({ severity: 'info', summary: message, life: 2000 })
    }
  }
}

export class SaveAsDocumentUiCommand extends DiagramUiCommandBase<DiagramFileSaveAsParams> {
  readonly dataCommandId = DiagramCmd.File.SaveAs

  protected buildPayload(params: DiagramFileSaveAsParams): DiagramFileSaveAsParams {
    return params
  }

  protected afterDataSuccess(
    _result: Extract<DiagramCommandResult, { ok: true }>,
    _params: DiagramFileSaveAsParams,
    ui: DiagramUiRuntime
  ) {
    ui.toast?.success('已另存为')
  }
}

export class ReloadDocumentUiCommand extends DiagramUiCommandBase {
  readonly dataCommandId = DiagramCmd.File.Reload

  protected afterDataSuccess(
    _result: Extract<DiagramCommandResult, { ok: true }>,
    _params: void,
    ui: DiagramUiRuntime
  ) {
    ui.toast?.info('已重新加载')
  }
}

/** 保存：数据命令 + 成功/失败 toast（冲突 CONFLICT 不 toast，由上层处理） */
export async function runSaveDocumentUiCommand(
  file: DiagramFileCommands,
  payload: DiagramFileSaveParams | undefined,
  ui: DiagramUiRuntime,
  options?: { onDocumentSaved?: () => void }
): Promise<DiagramCommandResult> {
  const result = await file.save(payload)
  if (result.ok) {
    if (!(result.data as { noop?: boolean } | undefined)?.noop) {
      ui.toast?.success('已保存')
    }
    options?.onDocumentSaved?.()
    return result
  }
  if (result.code === 'CANCELED' || result.code === 'CONFLICT') return result
  ui.toast?.error(result.message ?? '保存失败')
  return result
}

/** 强制覆盖保存（冲突对话框「覆盖」） */
export async function runForceSaveUiCommand(
  file: DiagramFileCommands,
  payload: DiagramFileSaveParams,
  ui: DiagramUiRuntime,
  options?: { onDocumentSaved?: () => void }
): Promise<boolean> {
  const result = await file.save(payload)
  if (result.ok) {
    ui.toast?.success('已保存')
    options?.onDocumentSaved?.()
    return true
  }
  ui.toast?.error(result.message ?? '保存失败')
  return false
}

export async function runReloadDocumentUiCommand(
  file: DiagramFileCommands,
  ui: DiagramUiRuntime
): Promise<DiagramCommandResult> {
  const result = await file.reload()
  if (result.ok) {
    ui.toast?.info('已重新加载')
    return result
  }
  if (result.code !== 'CANCELED' && result.code !== 'VALIDATION') {
    ui.toast?.error(result.message ?? '重新加载失败')
  }
  return result
}

export async function runSaveAsDocumentUiCommand(
  file: DiagramFileCommands,
  params: DiagramFileSaveAsParams,
  ui: DiagramUiRuntime,
  options?: { onDocumentSaved?: () => void }
): Promise<boolean> {
  const result = await file.saveAs(params)
  if (result.ok) {
    ui.toast?.success('已另存为')
    options?.onDocumentSaved?.()
    return true
  }
  if (result.code !== 'CANCELED' && result.code !== 'VALIDATION') {
    ui.toast?.error(result.message ?? '另存为失败')
  }
  return false
}
