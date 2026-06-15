import { diagramCmd, diagramCmdEmpty } from '@modules/library/diagrams/app/command/domain/dispatch'
import type { DiagramCommandId } from '@modules/library/diagrams/app/command/domain/ids'
import type { DiagramCommandPayloadMap } from '@modules/library/diagrams/app/command/domain/payloads'
import type { IDiagramCommandParams } from '@modules/library/diagrams/app/command/domain/base'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

export { DiagramCmd } from '@modules/library/diagrams/app/command/domain/ids'
export { diagramCmd, diagramCmdEmpty } from '@modules/library/diagrams/app/command/domain/dispatch'

/** UI 层调用纯数据命令（无 UI 副作用） */
export function dispatchDiagramDataCommand(
  bus: IDiagramCommandBus,
  id: DiagramCommandId,
  payload?: IDiagramCommandParams
): Promise<DiagramCommandResult> {
  if (payload === undefined) {
    return bus.dispatch(diagramCmdEmpty(id))
  }
  return bus.dispatch(diagramCmd(id, payload))
}

export function dispatchDiagramDataCommandTyped<K extends keyof DiagramCommandPayloadMap>(
  bus: IDiagramCommandBus,
  id: K,
  payload: DiagramCommandPayloadMap[K]
): Promise<DiagramCommandResult> {
  return bus.dispatch(diagramCmd(id, payload))
}

/** 显式绑定 bus（组合根 provide 同组件内须用此 API，不能 inject） */
export function createDiagramDataCommandApi(bus: IDiagramCommandBus) {
  return {
    bus,
    dispatch: (id: DiagramCommandId, payload?: IDiagramCommandParams) =>
      dispatchDiagramDataCommand(bus, id, payload),
    dispatchTyped: <K extends keyof DiagramCommandPayloadMap>(
      id: K,
      payload: DiagramCommandPayloadMap[K]
    ) => dispatchDiagramDataCommandTyped(bus, id, payload),
    dispatchEmpty: (id: DiagramCommandId) => bus.dispatch(diagramCmdEmpty(id)),
    fire: (id: DiagramCommandId, payload?: IDiagramCommandParams) => {
      void dispatchDiagramDataCommand(bus, id, payload).then((result) => {
        if (!result.ok && import.meta.env.DEV) {
          console.warn(`[DiagramCommand] ${id}:`, result.message)
        }
      })
    },
    fireTyped: <K extends keyof DiagramCommandPayloadMap>(
      id: K,
      payload: DiagramCommandPayloadMap[K]
    ) => {
      void bus.dispatch(diagramCmd(id, payload)).then((result) => {
        if (!result.ok && import.meta.env.DEV) {
          console.warn(`[DiagramCommand] ${id}:`, result.message)
        }
      })
    },
    fireEmpty: (id: DiagramCommandId) => {
      void bus.dispatch(diagramCmdEmpty(id))
    }
  }
}

export type DiagramDataCommandApi = ReturnType<typeof createDiagramDataCommandApi>

export function useDiagramDataCommand(bus?: IDiagramCommandBus) {
  return createDiagramDataCommandApi(bus ?? useDiagramCommandBus())
}
