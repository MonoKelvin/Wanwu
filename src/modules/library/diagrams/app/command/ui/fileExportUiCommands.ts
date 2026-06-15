import { DiagramUiCommandBase, type DiagramUiRuntime } from '@modules/library/diagrams/app/command/ui/DiagramUiCommand'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type {
  DiagramFileExportParams,
  DiagramFileImportParams
} from '@modules/library/diagrams/app/command/domain/payloads'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { dispatchDiagramDataCommand } from '@modules/library/diagrams/composables/useDiagramDataCommand'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export class ExportCurrentPagePngUiCommand extends DiagramUiCommandBase<{ defaultName: string }> {
  readonly dataCommandId = DiagramCmd.File.Export

  protected buildPayload(): DiagramFileExportParams {
    return { format: 'png' }
  }

  protected async afterDataSuccess(
    result: Extract<DiagramCommandResult, { ok: true }>,
    params: { defaultName: string },
    ui: DiagramUiRuntime
  ) {
    const blob = (result.data as { blob?: Blob } | undefined)?.blob
    if (!blob) {
      ui.toast?.error('导出失败')
      return
    }
    const dataUrl = await blobToDataUrl(blob)
    const saved = await window.wanwu.shell.savePngDataUrl({
      dataUrl,
      defaultName: params.defaultName
    })
    if (saved.ok && saved.path) ui.toast?.success('已导出 PNG')
  }
}

export class ExportAllPagesPngUiCommand extends DiagramUiCommandBase<{ titleBase: string }> {
  readonly dataCommandId = DiagramCmd.File.Export

  protected buildPayload(): DiagramFileExportParams {
    return { format: 'png', scope: 'all' }
  }

  protected async afterDataSuccess(
    result: Extract<DiagramCommandResult, { ok: true }>,
    params: { titleBase: string },
    ui: DiagramUiRuntime
  ) {
    const pages = (result.data as { pages?: Array<{ pageName: string; blob: Blob }> } | undefined)?.pages
    if (!pages?.length) {
      ui.toast?.error('导出失败')
      return
    }
    let savedCount = 0
    for (const page of pages) {
      const dataUrl = await blobToDataUrl(page.blob)
      const saved = await window.wanwu.shell.savePngDataUrl({
        dataUrl,
        defaultName: `${params.titleBase}-${page.pageName}.png`
      })
      if (saved.canceled) break
      if (saved.ok) savedCount++
    }
    if (savedCount > 0) ui.toast?.success(`已导出 ${savedCount} 页 PNG`)
  }
}

export class ExportWfgUiCommand extends DiagramUiCommandBase {
  readonly dataCommandId = DiagramCmd.File.Export

  protected buildPayload(): DiagramFileExportParams {
    return { format: 'wfg' }
  }

  protected afterDataSuccess(
    result: Extract<DiagramCommandResult, { ok: true }>,
    _params: void,
    ui: DiagramUiRuntime
  ) {
    const data = result.data as { canceled?: boolean; path?: string }
    if (data.canceled) return
    if (data.path) ui.toast?.success('已导出流程图')
  }
}

export class ExportSvgUiCommand extends DiagramUiCommandBase<{ defaultName: string }> {
  readonly dataCommandId = DiagramCmd.File.Export

  protected buildPayload(): DiagramFileExportParams {
    return { format: 'svg' }
  }

  protected async afterDataSuccess(
    result: Extract<DiagramCommandResult, { ok: true }>,
    params: { defaultName: string },
    ui: DiagramUiRuntime
  ) {
    const svg = (result.data as { svg?: string } | undefined)?.svg
    if (!svg) {
      ui.toast?.error('导出失败')
      return
    }
    const saved = await window.wanwu.shell.saveTextFile({
      content: svg,
      defaultName: params.defaultName,
      extension: 'svg'
    })
    if (saved.ok && saved.path) ui.toast?.success('已导出 SVG')
  }
}

export type DiagramImportCmd = typeof DiagramCmd.File.ImportWfg | typeof DiagramCmd.File.ImportDrawio

/** 导入外部文件：数据命令 + 确认框 + toast */
export async function runImportExternalFileUiCommand(
  bus: IDiagramCommandBus,
  params: { type: DiagramImportCmd; folderId?: string; label: string },
  ui: DiagramUiRuntime
) {
  let result = await dispatchDiagramDataCommand(bus, params.type, { folderId: params.folderId })
  if (!result.ok && result.code === 'VALIDATION') {
    const discard = await ui.confirm?.({
      header: '未保存的更改',
      message: '导入将替换当前画布内容。不保存并导入，还是取消？',
      acceptLabel: '不保存并导入',
      rejectLabel: '取消'
    })
    if (!discard) return result
    result = await dispatchDiagramDataCommand(
      bus,
      params.type,
      { discard: true, folderId: params.folderId } as DiagramFileImportParams
    )
  }
  if (!result.ok) {
    if (result.message && result.code !== 'VALIDATION') ui.toast?.error(result.message)
    return result
  }
  const data = result.data as { canceled?: boolean; title?: string }
  if (!data.canceled) {
    ui.toast?.success(`已导入${params.label}${data.title ? `：${data.title}` : ''}`)
  }
  return result
}
