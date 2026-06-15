import type {
  DiagramFileOpenParams,
  DiagramFileSaveAsParams,
  DiagramFileSaveParams
} from '@modules/library/diagrams/app/command/domain/payloads'
import { createDiagramDataCommandApi } from '@modules/library/diagrams/composables/useDiagramDataCommand'
import { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

/** 文件（File）数据命令封装：打开、保存等 */
export function createDiagramFileCommands(bus: IDiagramCommandBus) {
  const { dispatch, dispatchEmpty, dispatchTyped } = createDiagramDataCommandApi(bus)

  return {
    open: (payload: DiagramFileOpenParams) => dispatchTyped(DiagramCmd.File.Open, payload),
    save: (payload?: DiagramFileSaveParams) => dispatch(DiagramCmd.File.Save, payload),
    saveAs: (payload: DiagramFileSaveAsParams) => dispatchTyped(DiagramCmd.File.SaveAs, payload),
    reload: () => dispatchEmpty(DiagramCmd.File.Reload)
  }
}

export type DiagramFileCommands = ReturnType<typeof createDiagramFileCommands>

export function useDiagramFileCommands() {
  return createDiagramFileCommands(useDiagramCommandBus())
}
