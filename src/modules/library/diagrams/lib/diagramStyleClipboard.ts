import LogicFlow, { BaseNodeModel } from '@logicflow/core'
import type { DiagramCanvasTheme } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import {
  DEFAULT_GROUP_STYLE,
  isGroupFrameModel,
  isGroupFrameType,
  readGroupStyle
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  applyEdgeProperties,
  applyNodeProperties,
  readEdgeProperties,
  readNodeProperties
} from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramShadowPreset } from '@modules/library/diagrams/lib/diagramEditorConstants'
import type {
  DiagramEdgeProperties,
  DiagramNodeProperties,
  DiagramNodeTextStyle
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { defaultDefaultEdgeStyle } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export type DiagramFormatPainterKind = 'node' | 'edge'

export type DiagramNodeStyleSnapshot = Pick<
  DiagramNodeProperties,
  'fill' | 'stroke' | 'strokeWidth' | 'strokeDasharray' | 'shadow' | 'textStyle'
> & {
  isGroupFrame: boolean
  groupAlwaysVisible?: boolean
}

export type DiagramEdgeStyleSnapshot = Omit<DiagramEdgeProperties, 'id' | 'text'>

function refreshNodeModel(model: BaseNodeModel): void {
  if ('setAttributes' in model && typeof model.setAttributes === 'function') {
    ;(model as { setAttributes: () => void }).setAttributes()
  }
}

export function extractNodeStyleSnapshot(props: DiagramNodeProperties): DiagramNodeStyleSnapshot {
  return {
    fill: props.fill,
    stroke: props.stroke,
    strokeWidth: props.strokeWidth,
    strokeDasharray: props.strokeDasharray ?? '',
    shadow: props.shadow,
    textStyle: { ...props.textStyle },
    isGroupFrame: isGroupFrameType(props.type),
    groupAlwaysVisible: props.groupAlwaysVisible
  }
}

export function extractEdgeStyleSnapshot(props: DiagramEdgeProperties): DiagramEdgeStyleSnapshot {
  const { id: _id, text: _text, ...rest } = props
  return rest
}

export function readNodeStyleSnapshot(lf: LogicFlow, nodeId: string): DiagramNodeStyleSnapshot | null {
  const model = lf.getNodeModelById(nodeId)
  if (model && isGroupFrameModel(model)) {
    const gs = readGroupStyle(model.properties as Record<string, unknown>)
    return {
      fill: gs.fill,
      stroke: gs.stroke,
      strokeWidth: gs.strokeWidth,
      strokeDasharray: gs.strokeDasharray,
      shadow: 'none',
      textStyle: defaultNodeTextStyle('light'),
      isGroupFrame: true,
      groupAlwaysVisible: Boolean(model.properties?.dgGroupAlwaysVisible)
    }
  }
  const props = readNodeProperties(lf, nodeId)
  return props ? extractNodeStyleSnapshot(props) : null
}

export function readEdgeStyleSnapshot(lf: LogicFlow, edgeId: string): DiagramEdgeStyleSnapshot | null {
  const props = readEdgeProperties(lf, edgeId)
  return props ? extractEdgeStyleSnapshot(props) : null
}

export function applyNodeStyleSnapshot(
  lf: LogicFlow,
  targetId: string,
  snapshot: DiagramNodeStyleSnapshot
): void {
  const model = lf.getNodeModelById(targetId)
  if (!model) return

  if (isGroupFrameModel(model)) {
    lf.setProperties(targetId, {
      dgGroupStyle: {
        fill: snapshot.fill,
        stroke: snapshot.stroke,
        strokeWidth: snapshot.strokeWidth,
        strokeDasharray: snapshot.strokeDasharray || DEFAULT_GROUP_STYLE.strokeDasharray
      },
      ...(snapshot.isGroupFrame && snapshot.groupAlwaysVisible !== undefined
        ? { dgGroupAlwaysVisible: snapshot.groupAlwaysVisible }
        : {})
    })
    refreshNodeModel(model)
    return
  }

  applyNodeProperties(lf, {
    id: targetId,
    fill: snapshot.fill,
    stroke: snapshot.stroke,
    strokeWidth: snapshot.strokeWidth,
    strokeDasharray: snapshot.strokeDasharray,
    shadow: snapshot.shadow,
    textStyle: { ...snapshot.textStyle }
  })
}

export function applyEdgeStyleSnapshot(
  lf: LogicFlow,
  targetId: string,
  snapshot: DiagramEdgeStyleSnapshot
): void {
  applyEdgeProperties(lf, { id: targetId, ...snapshot })
}

export function defaultNodeTextStyle(resolved: DiagramCanvasTheme): DiagramNodeTextStyle {
  const textColor = resolved === 'dark' ? '#e8e8ec' : '#121214'
  return {
    fontSize: 12,
    color: textColor,
    fontFamily: '',
    textAlign: 'center',
    fontWeight: 'normal',
    fontStyle: 'normal',
    underline: false,
    strikethrough: false
  }
}

export function defaultNodeAppearance(resolved: DiagramCanvasTheme): {
  fill: string
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  shadow: DiagramShadowPreset
} {
  const isDark = resolved === 'dark'
  return {
    fill: isDark ? '#2a2a2e' : '#ffffff',
    stroke: isDark ? '#5a5a62' : '#d0d0d4',
    strokeWidth: 1,
    strokeDasharray: '',
    shadow: 'none'
  }
}

export function clearNodeStyle(lf: LogicFlow, nodeId: string, resolved: DiagramCanvasTheme): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return

  if (isGroupFrameModel(model)) {
    lf.setProperties(nodeId, {
      dgGroupStyle: { ...DEFAULT_GROUP_STYLE },
      dgGroupAlwaysVisible: false
    })
    refreshNodeModel(model)
    return
  }

  const appearance = defaultNodeAppearance(resolved)
  applyNodeProperties(lf, {
    id: nodeId,
    ...appearance,
    textStyle: defaultNodeTextStyle(resolved),
    imageAsset: null
  })
}

export function clearEdgeStyle(
  lf: LogicFlow,
  edgeId: string,
  resolved: DiagramCanvasTheme
): void {
  const defaults = defaultDefaultEdgeStyle(resolved)
  applyEdgeProperties(lf, {
    id: edgeId,
    type: defaults.type,
    stroke: defaults.stroke,
    strokeWidth: defaults.strokeWidth,
    strokeDasharray: defaults.strokeDasharray,
    startArrowType: defaults.startArrowType,
    endArrowType: defaults.endArrowType
  })
}
