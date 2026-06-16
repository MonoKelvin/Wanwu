import type LogicFlow from '@logicflow/core'
import type { IDiagramShapeRenderer } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { registerTableShape } from '@modules/library/diagrams/extensions/table/render'

export const tableRenderer: IDiagramShapeRenderer = {
  lfTypes: ['dg-table'],
  register(lf: LogicFlow) {
    registerTableShape(lf)
  }
}
