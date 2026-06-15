export interface DiagramTableData {
  showHeader: boolean
  columns: string[]
  rows: string[][]
}

export const DIAGRAM_TABLE_KIND = 'diagram.table' as const

export function createTableCellId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function createDefaultTableData(): DiagramTableData {
  return {
    showHeader: true,
    columns: ['列 A', '列 B', '列 C'],
    rows: [
      ['', '', ''],
      ['', '', '']
    ]
  }
}
