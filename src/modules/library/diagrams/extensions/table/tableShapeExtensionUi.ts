import type { IDiagramShapeExtensionRegistry } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { DIAGRAM_TABLE_KIND } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import TablePropertyEditor from '@modules/library/diagrams/extensions/table/TablePropertyEditor.vue'
import '@modules/library/diagrams/extensions/table/table-canvas.css'

export function registerTableShapeExtensionUi(registry: IDiagramShapeExtensionRegistry): void {
  registry.registerPropertyEditor(DIAGRAM_TABLE_KIND, {
    kind: DIAGRAM_TABLE_KIND,
    order: 'before-common',
    textSectionTitle: '单元格文字',
    component: TablePropertyEditor
  })
}
