import { buildShapeExtensionModifyNodePatch } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { normalizeTableData } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { DIAGRAM_TABLE_KIND, type DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

/** 表格 dgShape 写入：走 ModifyNode 命令，纳入撤销栈 */
export function buildTableModifyNodePatch(
  data: DiagramTableData
): Record<string, unknown> | null {
  return buildShapeExtensionModifyNodePatch(DIAGRAM_TABLE_KIND, normalizeTableData(data))
}
