import type LogicFlow from '@logicflow/core'
import type { BaseNodeModel } from '@logicflow/core'
import type { IDiagramShapePayloadCodec } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
import {
  isTableDividerDragging,
  isTableNodeResizing
} from '@modules/library/diagrams/extensions/table/interaction/tableCanvasRuntime'
import {
  computeTableLayout,
  computeTableMinSize,
  normalizeTableData,
  syncTableLayoutToNode
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import {
  createDefaultTableData,
  DIAGRAM_TABLE_KIND,
  type DiagramTableData
} from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { toTableCellMeasureStyle } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'

export const tableCodec: IDiagramShapePayloadCodec<DiagramTableData> = {
  kind: DIAGRAM_TABLE_KIND,
  syncLfText: false,
  layoutHandledByModel: true,

  createDefault(_paletteItem?: DiagramShapeItem, overrides?: Partial<DiagramTableData>) {
    return { ...createDefaultTableData(), ...overrides }
  },

  read(envelope) {
    return normalizeTableData(envelope.data as DiagramTableData)
  },

  toEnvelope(data) {
    return {
      schemaVersion: 1,
      kind: DIAGRAM_TABLE_KIND,
      data: normalizeTableData(data)
    }
  },

  serializeText(data) {
    const normalized = normalizeTableData(data)
    const lines: string[] = []
    if (normalized.showHeader) lines.push(normalized.columns.join('\t'))
    for (const row of normalized.rows) lines.push(row.join('\t'))
    return lines.join('\n')
  },

  syncLayoutToModel(model, data) {
    const node = model as BaseNodeModel
    const measureOptions = {
      cellStyle: toTableCellMeasureStyle(node, false),
      headerStyle: toTableCellMeasureStyle(node, true)
    }
    if (isTableDividerDragging() || isTableNodeResizing()) {
      const mins = computeTableMinSize(data, measureOptions)
      node.minWidth = mins.minWidth
      node.minHeight = mins.minHeight
      return
    }
    syncTableLayoutToNode(
      node as BaseNodeModel & { setProperties: (p: Record<string, unknown>) => void },
      data,
      measureOptions
    )
  },

  computeLayout(data, width) {
    const layout = computeTableLayout(data, width)
    const mins = computeTableMinSize(data)
    return {
      width: layout.width,
      height: layout.height,
      minWidth: mins.minWidth,
      minHeight: mins.minHeight
    }
  },

  migrateLegacyNode(node: LogicFlow.NodeConfig) {
    const text = String(node.text ?? '').trim()
    if (!text) return null
    const rows = text.split('\n').map((line) => line.split('\t'))
    if (rows.length < 1) return null
    return {
      schemaVersion: 1,
      kind: DIAGRAM_TABLE_KIND,
      data: normalizeTableData({
        showHeader: true,
        columns: rows[0]!.map((c, i) => c || `列 ${i + 1}`),
        rows: rows.slice(1).map((r) => r.map((c) => c ?? ''))
      })
    }
  }
}
