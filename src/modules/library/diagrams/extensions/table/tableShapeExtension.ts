import type { DiagramShapeExtension } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { tableCodec } from '@modules/library/diagrams/extensions/table/kinds/tableCodec'
import { DIAGRAM_TABLE_KIND } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { tableRenderer } from '@modules/library/diagrams/extensions/table/tableRenderer'

export const tableShapeExtension: DiagramShapeExtension = {
  id: 'table',
  label: '表格',
  kinds: [
    {
      kind: DIAGRAM_TABLE_KIND,
      lfTypes: ['dg-table'],
      interactionMode: 'node',
      codec: tableCodec,
      renderer: tableRenderer,
      propertyPanelPolicy: {
        extensionOrder: 100,
        hideSections: { 'node-text-content': true },
        textSectionTitle: '边框样式'
      }
    }
  ],
  paletteBindings: [{ paletteId: 'dg-table', kind: DIAGRAM_TABLE_KIND }]
}
