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
  const grid = isDark ? '#3a3a42' : '#e0e0e4'
  return {
    vertical: isDark ? '#3f3f46' : '#d8d8de',
    horizontal: isDark ? '#45454d' : '#dedee4',
    width: 1,
    grid
  }
}

export function diagramCanvasBackground(resolved: DiagramCanvasTheme) {
  return resolved === 'dark' ? '#161618' : '#ffffff'
}

function diagramTextTheme(resolved: DiagramCanvasTheme) {
  const isDark = resolved === 'dark'
  const textColor = isDark ? '#e8e8ec' : '#121214'
  return {
    fill: textColor,
    color: textColor,
    fontSize: 12,
    overflowMode: 'autoWrap' as const,
    lineHeight: 1.2,
    wrapPadding: '4, 8'
  }
}

/** LogicFlow 连线标签：SVG 文本用 fill，且需单独配置 background */
function diagramEdgeTextTheme(resolved: DiagramCanvasTheme) {
  const isDark = resolved === 'dark'
  const textColor = isDark ? '#e8e8ec' : '#121214'
  return {
    fill: textColor,
    color: textColor,
    fontSize: 12,
    textWidth: 100,
    overflowMode: 'default' as const,
    lineHeight: 1.2,
    background: {
      fill: isDark ? 'rgb(42 42 46 / 0.92)' : 'rgb(255 255 255 / 0.94)',
      wrapPadding: '2, 4'
    }
  }
}

export function diagramLogicFlowTheme(resolved: DiagramCanvasTheme): Record<string, unknown> {
  const isDark = resolved === 'dark'
  const nodeFill = isDark ? '#2a2a2e' : '#ffffff'
  const nodeStroke = isDark ? '#5a5a62' : '#d0d0d4'
  const textTheme = diagramTextTheme(resolved)
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
      ...textTheme,
      fontSize: 14,
      fontWeight: 500
    },
    nodeText: textTheme,
    edgeText: diagramEdgeTextTheme(resolved),
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
