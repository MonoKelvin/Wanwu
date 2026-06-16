import { h } from '@logicflow/core'
import { TABLE_LAYOUT } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'

/** 表格外上方居中：移动手柄（四向箭头，整块可点） */
export function renderTableMoveOverlay(
  left: number,
  top: number,
  width: number,
  _height: number,
  nodeId: string
): unknown {
  const size = TABLE_LAYOUT.MOVE_SIZE
  const hit = TABLE_LAYOUT.MOVE_HIT
  const edgeGap = TABLE_LAYOUT.TOOL_GAP
  const cx = left + width / 2
  const cy = top - edgeGap - size / 2
  const half = size / 2
  const hitHalf = hit / 2
  const arm = size * 0.22
  const head = size * 0.1

  const arrowUp = `M ${cx} ${cy - arm} L ${cx - head} ${cy - arm + head} M ${cx} ${cy - arm} L ${cx + head} ${cy - arm + head}`
  const arrowDown = `M ${cx} ${cy + arm} L ${cx - head} ${cy + arm - head} M ${cx} ${cy + arm} L ${cx + head} ${cy + arm - head}`
  const arrowLeft = `M ${cx - arm} ${cy} L ${cx - arm + head} ${cy - head} M ${cx - arm} ${cy} L ${cx - arm + head} ${cy + head}`
  const arrowRight = `M ${cx + arm} ${cy} L ${cx + arm - head} ${cy - head} M ${cx + arm} ${cy} L ${cx + arm - head} ${cy + head}`

  return h(
    'g',
    {
      className: 'dg-table-move-overlay',
      'data-dg-node-id': nodeId
    },
    [
      h('line', {
        x1: cx,
        y1: cy + half + 2,
        x2: cx,
        y2: top,
        class: 'dg-table-tool-guide',
        pointerEvents: 'none'
      }),
      h(
        'g',
        {
          className: 'dg-table-move-handle-hit',
          'data-dg-node-id': nodeId
        },
        [
          h('rect', {
            x: cx - hitHalf,
            y: cy - hitHalf,
            width: hit,
            height: hit,
            fill: 'transparent',
            stroke: 'none',
            className: 'dg-table-move-handle__hit',
            'data-dg-node-id': nodeId
          }),
          h('rect', {
            x: cx - half,
            y: cy - half,
            width: size,
            height: size,
            rx: 6,
            className: 'dg-table-move-handle__box',
            pointerEvents: 'none',
            'data-dg-node-id': nodeId
          }),
          h(
            'g',
            {
              className: 'dg-table-move-handle__glyph',
              pointerEvents: 'none'
            },
            [
              h('line', {
                x1: cx,
                y1: cy - arm,
                x2: cx,
                y2: cy + arm,
                class: 'dg-table-move-handle__line'
              }),
              h('line', {
                x1: cx - arm,
                y1: cy,
                x2: cx + arm,
                y2: cy,
                class: 'dg-table-move-handle__line'
              }),
              h('path', { d: arrowUp, class: 'dg-table-move-handle__line' }),
              h('path', { d: arrowDown, class: 'dg-table-move-handle__line' }),
              h('path', { d: arrowLeft, class: 'dg-table-move-handle__line' }),
              h('path', { d: arrowRight, class: 'dg-table-move-handle__line' })
            ]
          )
        ]
      )
    ]
  )
}
