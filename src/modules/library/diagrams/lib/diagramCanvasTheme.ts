export type DiagramCanvasTheme = 'light' | 'dark'

const GRID_SIZE = 20

export function diagramGridOptions(resolved: DiagramCanvasTheme) {
  const isDark = resolved === 'dark'
  return {
    size: GRID_SIZE,
    visible: true,
    type: 'mesh' as const,
    majorBold: false,
    config: {
      color: isDark ? '#3a3a42' : '#e0e0e4',
      thickness: 1
    }
  }
}

export function diagramAxisStyle(resolved: DiagramCanvasTheme) {
  const isDark = resolved === 'dark'
  return {
    color: isDark ? '#7a7a84' : '#a8a8b0',
    width: 1.75
  }
}

export function diagramCanvasBackground(resolved: DiagramCanvasTheme) {
  return resolved === 'dark' ? '#161618' : '#ffffff'
}

export function diagramLogicFlowTheme(resolved: DiagramCanvasTheme): Record<string, unknown> {
  const isDark = resolved === 'dark'
  const nodeFill = isDark ? '#2a2a2e' : '#ffffff'
  const nodeStroke = isDark ? '#5a5a62' : '#d0d0d4'
  const textColor = isDark ? '#e8e8ec' : '#121214'
  const edgeStroke = isDark ? '#707078' : '#5a5a62'

  return {
    background: { backgroundColor: diagramCanvasBackground(resolved) },
    grid: diagramGridOptions(resolved),
    rect: {
      fill: nodeFill,
      stroke: nodeStroke,
      strokeWidth: 1,
      radius: 4
    },
    circle: {
      fill: nodeFill,
      stroke: nodeStroke,
      strokeWidth: 1
    },
    diamond: {
      fill: nodeFill,
      stroke: nodeStroke,
      strokeWidth: 1
    },
    ellipse: {
      fill: nodeFill,
      stroke: nodeStroke,
      strokeWidth: 1
    },
    polygon: {
      fill: nodeFill,
      stroke: nodeStroke,
      strokeWidth: 1
    },
    text: {
      color: textColor,
      fontSize: 14,
      fontWeight: 500
    },
    nodeText: {
      color: textColor,
      fontSize: 12
    },
    edgeText: {
      color: textColor,
      fontSize: 12
    },
    polyline: {
      stroke: edgeStroke,
      strokeWidth: 1.5
    },
    line: {
      stroke: edgeStroke,
      strokeWidth: 1.5
    },
    anchor: {
      fill: isDark ? '#888890' : '#5a5a62',
      stroke: isDark ? '#2a2a2e' : '#ffffff'
    },
    anchorLine: {
      stroke: edgeStroke,
      strokeWidth: 1
    }
  }
}
