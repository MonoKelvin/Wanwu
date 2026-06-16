/** 单元格文字样式覆盖（key 见 tableCellStyleKey） */
export type TableCellTextStyleOverride = {
  fontSize?: number
  color?: string
  fontFamily?: string
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  underline?: boolean
  strikethrough?: boolean
  textAlign?: 'left' | 'center' | 'right'
}

export interface DiagramTableData {
  showHeader: boolean
  columns: string[]
  rows: string[][]
  /** 各列宽度（像素）；缺省时按内容测量 */
  colWidths?: number[]
  /** 各数据行高度（像素）；缺省时使用默认行高 */
  rowHeights?: number[]
  /** 表头行高度（像素） */
  headerHeight?: number
  /** 单元格级文字样式；表头 h{col}，数据格 r{row}c{col} */
  cellTextStyles?: Record<string, TableCellTextStyleOverride>
}

export function tableCellStyleKey(row: number, col: number): string {
  return row === -1 ? `h${col}` : `r${row}c${col}`
}

export const DIAGRAM_TABLE_KIND = 'diagram.table' as const

/** LogicFlow 节点 type，与 registerTableShape 注册一致 */
export const DIAGRAM_TABLE_LF_TYPE = 'dg-table' as const

export function createTableCellId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function createDefaultTableData(): DiagramTableData {
  return {
    showHeader: true,
    columns: ['', '', ''],
    rows: [
      ['', '', ''],
      ['', '', '']
    ]
  }
}
