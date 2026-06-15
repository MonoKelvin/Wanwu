import type LogicFlow from '@logicflow/core'
import type { IDiagramShapePayloadCodec } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
import {
  computeTableLayout,
  normalizeTableData,
  syncTableLayoutToNode
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import {
  createDefaultTableData,
  DIAGRAM_TABLE_KIND,
  type DiagramTableData
} from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

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
    syncTableLayoutToNode(model as { width: number; height: number }, data)
  },

  computeLayout(data, width) {
    const layout = computeTableLayout(data, width)
    return {
      width: layout.width,
      height: layout.height,
      minWidth: 72,
      minHeight: 26
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
