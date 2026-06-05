import type LogicFlow from '@logicflow/core'

const AXIS_EXTENT = 120_000

export type DiagramAxisStyle = {
  color: string
  width: number
}

export function mountDiagramAxisOverlay(
  lf: LogicFlow,
  getStyle: () => DiagramAxisStyle
): () => void {
  const svg = lf.container.querySelector('.lf-grid svg')
  if (!svg) return () => {}

  const ns = 'http://www.w3.org/2000/svg'
  const g = document.createElementNS(ns, 'g')
  g.setAttribute('class', 'dg-axis-overlay')
  g.setAttribute('pointer-events', 'none')

  const vLine = document.createElementNS(ns, 'line')
  vLine.setAttribute('x1', '0')
  vLine.setAttribute('y1', String(-AXIS_EXTENT))
  vLine.setAttribute('x2', '0')
  vLine.setAttribute('y2', String(AXIS_EXTENT))

  const hLine = document.createElementNS(ns, 'line')
  hLine.setAttribute('x1', String(-AXIS_EXTENT))
  hLine.setAttribute('y1', '0')
  hLine.setAttribute('x2', String(AXIS_EXTENT))
  hLine.setAttribute('y2', '0')

  g.append(vLine, hLine)
  svg.appendChild(g)

  const sync = () => {
    const style = getStyle()
    vLine.setAttribute('stroke', style.color)
    hLine.setAttribute('stroke', style.color)
    vLine.setAttribute('stroke-width', String(style.width))
    hLine.setAttribute('stroke-width', String(style.width))

    const { SCALE_X, SCALE_Y, TRANSLATE_X, TRANSLATE_Y } = lf.getTransform()
    g.setAttribute(
      'transform',
      `matrix(${SCALE_X},0,0,${SCALE_Y},${TRANSLATE_X},${TRANSLATE_Y})`
    )
  }

  sync()
  lf.on('graph:transform', sync)

  return () => {
    lf.off('graph:transform', sync)
    g.remove()
  }
}
