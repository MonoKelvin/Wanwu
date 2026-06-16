import type { DiagramShapeExtension } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import { tableCodec } from '@modules/library/diagrams/extensions/table/kinds/tableCodec'
import { DIAGRAM_TABLE_KIND } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { bindDiagramTableCanvasEvents } from '@modules/library/diagrams/extensions/table/interaction/bindDiagramTableCanvasEvents'
import { tableContextMenuContributor } from '@modules/library/diagrams/extensions/table/tableContextMenuContributor'
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
        textSectionTitle: '单元格文字'
      },
      resizePolicy: {
        handles: ['nw', 'ne', 'se', 'sw']
      },
      canvasInteractionBinders: [bindDiagramTableCanvasEvents],
      contextMenuContributor: tableContextMenuContributor
    }
  ],
  paletteBindings: [{ paletteId: 'dg-table', kind: DIAGRAM_TABLE_KIND }]
}
