import type LogicFlow from '@logicflow/core'
import type { IDiagramShapeRenderer } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { registerUmlClassifierShapes } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierRegs'

export const umlClassifierRenderer: IDiagramShapeRenderer = {
  lfTypes: ['dg-uml-class', 'dg-uml-interface'],
  register(lf: LogicFlow) {
    registerUmlClassifierShapes(lf)
  }
}
