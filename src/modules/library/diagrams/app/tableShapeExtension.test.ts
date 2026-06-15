import { describe, expect, it } from 'vitest'
import { computeTableLayout, normalizeTableData } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { tableCodec } from '@modules/library/diagrams/extensions/table/kinds/tableCodec'

describe('table shape extension', () => {
  it('normalizes row width to column count', () => {
    const data = normalizeTableData({
      showHeader: true,
      columns: ['A', 'B'],
      rows: [['1', '2', '3']]
    })
    expect(data.columns).toEqual(['A', 'B'])
    expect(data.rows[0]).toEqual(['1', '2'])
  })

  it('computes layout height from header and rows', () => {
    const layout = computeTableLayout(
      normalizeTableData({
        showHeader: true,
        columns: ['A', 'B', 'C'],
        rows: [['', ''], ['', '']]
      })
    )
    expect(layout.width).toBeGreaterThan(200)
    expect(layout.height).toBeGreaterThan(70)
    expect(layout.lines.some((line) => line.kind === 'header')).toBe(true)
  })

  it('round-trips codec envelope', () => {
    const data = tableCodec.createDefault()
    const envelope = tableCodec.toEnvelope(data)
    const read = tableCodec.read(envelope)
    expect(read.columns.length).toBe(3)
    expect(read.rows.length).toBe(2)
  })
})
