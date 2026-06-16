/** 表格外观：从节点 style 派生填充/网格/表头/斑马纹 */

export type TableNodeAppearance = {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray?: string
}

export function readTableNodeAppearance(style: Record<string, unknown>): TableNodeAppearance {
  const fill = String(style.fill ?? '#ffffff')
  const stroke = String(style.stroke ?? '#d0d0d4')
  const strokeWidth = Number(style.strokeWidth ?? 1)
  const dash = style.strokeDasharray
  const strokeDasharray =
    dash != null && String(dash).trim().length > 0 ? String(dash) : undefined
  return { fill, stroke, strokeWidth, strokeDasharray }
}

/** 供根节点 style 注入，CSS color-mix 基于用户填充/边框色 */
export function tableAppearanceCssVars(appearance: TableNodeAppearance): Record<string, string> {
  return {
    '--dg-table-fill': appearance.fill,
    '--dg-table-stroke': appearance.stroke
  }
}
