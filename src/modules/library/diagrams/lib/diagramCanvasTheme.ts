export type DiagramCanvasTheme = 'light' | 'dark'

export const DIAGRAM_GRID_SIZE = 20
/** 拖拽时接近网格线的轻吸附阈值（px），避免全程强吸附不跟手 */
export const DIAGRAM_SOFT_SNAP_THRESHOLD = 8

/** 将坐标对齐到网格交点（LogicFlow 拖拽中实时 snap 会导致不跟手，应在 dragend 使用） */
export function snapCoordinateToGrid(value: number, gridSize = DIAGRAM_GRID_SIZE): number {
  return gridSize * Math.round(value / gridSize)
}

/** 拖拽过程中：仅当接近网格时轻吸附 */
export function softSnapCoordinate(
  value: number,
  gridSize = DIAGRAM_GRID_SIZE,
  threshold = DIAGRAM_SOFT_SNAP_THRESHOLD
): number {
  const snapped = snapCoordinateToGrid(value, gridSize)
  return Math.abs(value - snapped) <= threshold ? snapped : value
}

export function diagramSnaplineTheme(resolved: DiagramCanvasTheme) {
  const isDark = resolved === 'dark'
  return {
    stroke: isDark ? '#5a5a64' : '#dcdce2',
    strokeWidth: 1,
    strokeDasharray: '3,3',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const
  }
}

export function diagramGridOptions(resolved: DiagramCanvasTheme) {
  const isDark = resolved === 'dark'
  return {
    size: DIAGRAM_GRID_SIZE,
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
  // 中心参考线：与网格同色阶、仅略深/略浅，线宽微增即可辨认
  const axis = isDark ? '#3e3e46' : '#dcdce0'
  return {
    vertical: axis,
    horizontal: axis,
    width: 1.25,
    grid
  }
}

export function diagramCanvasBackground(resolved: DiagramCanvasTheme) {
  // 与 --ww-content / --dg-canvas-bg 一致，避免画布边缘色差描边
  return resolved === 'dark' ? '#18181b' : '#ffffff'
}

/** 从 DOM 读取当前深浅色（属性面板/导出等无 LF 主题上下文时使用） */
export function resolveDiagramCanvasTheme(el?: ParentNode | null): DiagramCanvasTheme {
  if (typeof document === 'undefined') return 'light'
  const host = (el as HTMLElement | null) ?? document.querySelector('.dg-canvas-frame')
  const themed =
    host?.closest('[data-theme]')?.getAttribute('data-theme') ??
    document.documentElement.getAttribute('data-theme')
  return themed === 'dark' ? 'dark' : 'light'
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
      fill: isDark ? '#2a2a2e' : '#ffffff',
      wrapPadding: '4, 8',
      radius: 4,
      stroke: 'none',
      strokeWidth: 0
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
    background: {
      background: diagramCanvasBackground(resolved),
      backgroundColor: diagramCanvasBackground(resolved)
    },
    grid: diagramGridOptions(resolved),
    snapline: diagramSnaplineTheme(resolved),
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
    },
    edgeAdjust: {
      r: 5,
      fill: nodeFill,
      stroke: edgeStroke,
      strokeWidth: 1.5
    }
  }
}
