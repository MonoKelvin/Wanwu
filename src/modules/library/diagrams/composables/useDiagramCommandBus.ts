import { inject, provide, type InjectionKey } from 'vue'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { DIAGRAM_COMMAND_BUS } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import { initDiagramCatalogCommandBus } from '@shared/stores/diagrams'

const busKey = DIAGRAM_COMMAND_BUS as InjectionKey<IDiagramCommandBus>

export function provideDiagramCommandBus(bus: IDiagramCommandBus): void {
  provide(busKey, bus)
}

export function useDiagramCommandBus(): IDiagramCommandBus {
  const bus = inject(busKey)
  if (!bus) throw new Error('DiagramCommandBus 未注入')
  return bus
}

/** 列表/首页使用的全局命令总线（仅 file/folder） */
let catalogBus: IDiagramCommandBus | null = null

export function setDiagramCatalogCommandBus(bus: IDiagramCommandBus): void {
  catalogBus = bus
}

export function useDiagramCatalogCommandBus(): IDiagramCommandBus {
  if (!catalogBus) return initDiagramCatalogCommandBus()
  return catalogBus
}
