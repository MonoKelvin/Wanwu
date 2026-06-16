import { h } from '@logicflow/core'
import { TABLE_LAYOUT } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import type { TableLayoutLine } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import type { TableCellTextPaint } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'

const CELL_TEXT_PAD_Y = 4

/**
 * 与 LogicFlow autoWrap 一致：foreignObject + HTML，避免 SVG text 字体发虚、行距不齐。
 */
export function renderTableCellHtmlText(
  top: number,
  line: TableLayoutLine,
  cellLeft: number,
  cellW: number,
  paint: TableCellTextPaint,
  wrapped: string[]
): unknown {
  const padX = TABLE_LAYOUT.PAD_X
  const innerW = Math.max(8, cellW - padX * 2)
  const cellTop = top + line.cellTop
  const innerH = Math.max(0, line.cellHeight - CELL_TEXT_PAD_Y * 2)

  const contentStyle: Record<string, string | number> = {
    fontSize: `${paint.fontSize}px`,
    lineHeight: paint.lineHeight,
    color: paint.color,
    fontWeight: paint.fontWeight,
    fontStyle: paint.fontStyle,
    textAlign: paint.textAlign,
    fontFamily: paint.fontFamily
  }
  if (paint.textDecoration && paint.textDecoration !== 'none') {
    contentStyle.textDecoration = paint.textDecoration
  }

  return h(
    'foreignObject',
    {
      x: cellLeft + padX,
      y: cellTop + CELL_TEXT_PAD_Y,
      width: innerW,
      height: innerH,
      style: { overflow: 'hidden', pointerEvents: 'none' }
    },
    h(
      'div',
      {
        className: 'lf-node-text-auto-wrap',
        style: {
          minHeight: '100%',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'border-box'
        }
      },
      h(
        'div',
        {
          className: 'lf-node-text-auto-wrap-content',
          style: contentStyle
        },
        wrapped.map((segment) =>
          h(
            'div',
            {
              className: 'lf-node-text--auto-wrap-inner'
            },
            segment || '\u00a0'
          )
        )
      )
    )
  )
}
