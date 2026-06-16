import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  contentMinColWidths,
  contentMinHeaderHeight,
  contentMinRowHeights
} from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'
import {
  computeTableMinSize,
  materializeTableDimensions,
  normalizeTableData,
  TABLE_LAYOUT
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'

export type { TableMinSize } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'

export { computeTableMinSize, materializeTableDimensions } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'

/**
 * 从 primaryIndex 起向左侧级联吸收宽度变化（缩小从 primary 向左，放大加到 primary）
 * 返回 null 表示已达最小无法再缩
 */
export function absorbWidthDelta(
  colWidths: number[],
  delta: number,
  primaryIndex: number,
  minWidths?: number[]
): number[] | null {
  if (Math.abs(delta) < 0.01) return colWidths
  const defaultMin = TABLE_LAYOUT.COL_MIN_W
  const minAt = (index: number) => minWidths?.[index] ?? defaultMin
  const widths = [...colWidths]
  const n = widths.length
  const idx = Math.max(0, Math.min(primaryIndex, n - 1))

  if (delta > 0) {
    widths[idx]! += delta
    return widths
  }

  let remaining = -delta
  for (let i = idx; i >= 0 && remaining > 0.01; i--) {
    const avail = widths[i]! - minAt(i)
    if (avail <= 0) continue
    const take = Math.min(remaining, avail)
    widths[i]! -= take
    remaining -= take
  }
  if (remaining > 0.01) return null
  return widths
}

export function absorbHeightDelta(
  rowHeights: number[],
  delta: number,
  primaryIndex: number,
  minHeights?: number[]
): number[] | null {
  if (Math.abs(delta) < 0.01) return rowHeights
  const defaultMin = TABLE_LAYOUT.ROW_H
  const minAt = (index: number) => minHeights?.[index] ?? defaultMin
  const heights = [...rowHeights]
  const n = heights.length
  const idx = Math.max(0, Math.min(primaryIndex, n - 1))

  if (delta > 0) {
    heights[idx]! += delta
    return heights
  }

  let remaining = -delta
  for (let i = idx; i >= 0 && remaining > 0.01; i--) {
    const avail = heights[i]! - minAt(i)
    if (avail <= 0) continue
    const take = Math.min(remaining, avail)
    heights[i]! -= take
    remaining -= take
  }
  if (remaining > 0.01) return null
  return heights
}

function absorbHeaderHeightDelta(headerHeight: number, delta: number): number | null {
  const min = TABLE_LAYOUT.ROW_H
  if (delta > 0) return headerHeight + delta
  const next = headerHeight + delta
  if (next < min) return null
  return next
}

/**
 * 角点缩放：宽变由末列（再向左级联）吸收，高变由末行（再向上级联）吸收
 */
export function fitTableToNodeSize(
  data: DiagramTableData,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number
): DiagramTableData | null {
  if (oldWidth <= 0 || oldHeight <= 0) return null

  const mins = computeTableMinSize(data)
  const targetW = Math.max(newWidth, mins.minWidth)
  const targetH = Math.max(newHeight, mins.minHeight)

  const materialized = materializeTableDimensions(data, oldWidth)
  let colWidths = [...materialized.colWidths!]
  let rowHeights = [...materialized.rowHeights!]
  const contentColMins = contentMinColWidths(materialized)
  const contentRowMins = contentMinRowHeights(materialized, colWidths)
  const headerHeight = materialized.showHeader
    ? materialized.headerHeight ?? TABLE_LAYOUT.HEADER_H
    : 0
  const headerMin = materialized.showHeader
    ? Math.max(
        TABLE_LAYOUT.ROW_H,
        contentMinHeaderHeight(materialized, colWidths)
      )
    : TABLE_LAYOUT.ROW_H

  const deltaW = targetW - oldWidth
  const deltaH = targetH - oldHeight

  if (Math.abs(deltaW) > 0.5) {
    const colMins = contentColMins.map((w) => Math.max(TABLE_LAYOUT.COL_MIN_W, w))
    const next = absorbWidthDelta(colWidths, deltaW, colWidths.length - 1, colMins)
    if (next) {
      colWidths = next
    } else if (deltaW > 0) {
      colWidths[colWidths.length - 1]! += deltaW
    }
  }

  if (Math.abs(deltaH) > 0.5) {
    const bodyOld = rowHeights.reduce((a, b) => a + b, 0)
    const bodyNew = Math.max(
      contentRowMins.reduce((a, b) => a + b, 0),
      targetH - headerHeight
    )
    const bodyDelta = bodyNew - bodyOld
    const rowMins = contentRowMins.map((h) => Math.max(TABLE_LAYOUT.ROW_H, h))
    const nextRows = absorbHeightDelta(rowHeights, bodyDelta, rowHeights.length - 1, rowMins)
    if (nextRows) {
      rowHeights = nextRows
    } else if (bodyDelta > 0) {
      rowHeights[rowHeights.length - 1]! += bodyDelta
    }
  }

  return normalizeTableData({
    ...materialized,
    colWidths,
    rowHeights,
    ...(materialized.showHeader !== false
      ? { headerHeight: Math.max(headerHeight, headerMin) }
      : {})
  })
}

/**
 * 列分割线：右侧列（含多级）让出宽度，左侧邻列获得；触达最小时停止
 */
export function resizeTableColumnDivider(
  data: DiagramTableData,
  dividerIndex: number,
  deltaX: number,
  tableWidth?: number
): DiagramTableData {
  if (Math.abs(deltaX) < 0.01) return normalizeTableData(data)

  const materialized = materializeTableDimensions(data, tableWidth)
  let colWidths = [...materialized.colWidths!]
  const contentMins = contentMinColWidths(materialized)
  const colMin = (index: number) =>
    Math.max(TABLE_LAYOUT.COL_MIN_W, contentMins[index] ?? TABLE_LAYOUT.COL_MIN_W)
  const leftCol = dividerIndex - 1
  const rightCol = dividerIndex
  if (leftCol < 0 || rightCol >= colWidths.length) return materialized

  if (deltaX > 0) {
    let need = deltaX
    let taken = 0
    for (let i = rightCol; i < colWidths.length && need > 0.01; i++) {
      const avail = colWidths[i]! - colMin(i)
      if (avail <= 0) continue
      const shrink = Math.min(need, avail)
      colWidths[i]! -= shrink
      need -= shrink
      taken += shrink
    }
    if (taken < 0.01) return materialized
    colWidths[leftCol]! += taken
  } else {
    let need = -deltaX
    let taken = 0
    for (let i = leftCol; i >= 0 && need > 0.01; i--) {
      const avail = colWidths[i]! - colMin(i)
      if (avail <= 0) continue
      const shrink = Math.min(need, avail)
      colWidths[i]! -= shrink
      need -= shrink
      taken += shrink
    }
    if (taken < 0.01) return materialized
    colWidths[rightCol]! += taken
  }

  return normalizeTableData({ ...materialized, colWidths })
}

/**
 * 行分割线：下方行（含多级）让出高度，上方邻行获得；表头/首行边界单独处理
 */
export function resizeTableRowDivider(
  data: DiagramTableData,
  dividerIndex: number,
  deltaY: number,
  tableHeight?: number
): DiagramTableData {
  if (Math.abs(deltaY) < 0.01) return normalizeTableData(data)

  const materialized = materializeTableDimensions(data, undefined, {}, tableHeight)
  let rowHeights = [...materialized.rowHeights!]
  const contentRowMins = contentMinRowHeights(materialized, materialized.colWidths!)
  const rowMin = (index: number) =>
    Math.max(TABLE_LAYOUT.ROW_H, contentRowMins[index] ?? TABLE_LAYOUT.ROW_H)
  let headerHeight = materialized.showHeader
    ? materialized.headerHeight ?? TABLE_LAYOUT.HEADER_H
    : 0
  const headerMin = materialized.showHeader
    ? Math.max(
        TABLE_LAYOUT.ROW_H,
        contentMinHeaderHeight(materialized, materialized.colWidths!)
      )
    : TABLE_LAYOUT.ROW_H

  if (materialized.showHeader && dividerIndex === 0) {
    if (deltaY > 0) {
      let need = deltaY
      let taken = 0
      for (let i = 0; i < rowHeights.length && need > 0.01; i++) {
        const avail = rowHeights[i]! - rowMin(i)
        if (avail <= 0) continue
        const shrink = Math.min(need, avail)
        rowHeights[i]! -= shrink
        need -= shrink
        taken += shrink
      }
      if (taken < 0.01) return materialized
      const nextHeader = absorbHeaderHeightDelta(headerHeight, taken)
      if (nextHeader == null) return materialized
      headerHeight = nextHeader
    } else {
      const need = -deltaY
      const avail = headerHeight - headerMin
      const taken = Math.min(need, avail)
      if (taken < 0.01) return materialized
      headerHeight -= taken
      rowHeights[0]! += taken
    }
    return normalizeTableData({
      ...materialized,
      headerHeight,
      rowHeights
    })
  }

  const upperRow = materialized.showHeader ? dividerIndex - 1 : dividerIndex
  const lowerRow = materialized.showHeader ? dividerIndex : dividerIndex + 1
  if (upperRow < 0 || lowerRow >= rowHeights.length) return materialized

  if (deltaY > 0) {
    let need = deltaY
    let taken = 0
    for (let i = lowerRow; i < rowHeights.length && need > 0.01; i++) {
      const avail = rowHeights[i]! - rowMin(i)
      if (avail <= 0) continue
      const shrink = Math.min(need, avail)
      rowHeights[i]! -= shrink
      need -= shrink
      taken += shrink
    }
    if (taken < 0.01) return materialized
    rowHeights[upperRow]! += taken
  } else {
    let need = -deltaY
    let taken = 0
    for (let i = upperRow; i >= 0 && need > 0.01; i--) {
      const avail = rowHeights[i]! - rowMin(i)
      if (avail <= 0) continue
      const shrink = Math.min(need, avail)
      rowHeights[i]! -= shrink
      need -= shrink
      taken += shrink
    }
    if (taken < 0.01) return materialized
    rowHeights[lowerRow]! += taken
  }

  return normalizeTableData({ ...materialized, rowHeights })
}

/** @deprecated 使用 fitTableToNodeSize */
export function scaleTableForNodeResize(
  data: DiagramTableData,
  oldWidth: number,
  oldHeight: number,
  newWidth: number,
  newHeight: number
): DiagramTableData | null {
  return fitTableToNodeSize(data, oldWidth, oldHeight, newWidth, newHeight)
}
