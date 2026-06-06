import type LogicFlow from '@logicflow/core'
import type { DiagramArrowType, DiagramShadowPreset } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { shadowStyleForPreset } from '@modules/library/diagrams/lib/diagramCanvasPresets'
import { readNodeImageAsset } from '@modules/library/diagrams/lib/diagramAssetRefs'
import type {
  DiagramEdgeProperties,
  DiagramNodeImageAsset,
  DiagramNodeProperties,
  DiagramNodeTextStyle
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

function nodeTextValue(text: unknown): string {
  if (typeof text === 'string') return text
  if (text && typeof text === 'object' && 'value' in text) {
    return String((text as { value?: string }).value ?? '')
  }
  return ''
}

function readShadowPreset(properties: Record<string, unknown>): DiagramShadowPreset {
  const preset = properties.shadowPreset
  if (preset === 'soft' || preset === 'medium' || preset === 'strong' || preset === 'none') {
    return preset
  }
  return 'none'
}

function textAlignToAnchor(align: DiagramNodeTextStyle['textAlign']): 'start' | 'middle' | 'end' {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'middle'
}

function anchorToTextAlign(anchor?: string): DiagramNodeTextStyle['textAlign'] {
  if (anchor === 'start') return 'left'
  if (anchor === 'end') return 'right'
  return 'center'
}

function buildLfTextStyle(ts: DiagramNodeTextStyle): Record<string, unknown> {
  const textDecoration = [ts.underline ? 'underline' : '', ts.strikethrough ? 'line-through' : '']
    .filter(Boolean)
    .join(' ')

  return {
    fontSize: ts.fontSize,
    fill: ts.color,
    color: ts.color,
    textAnchor: textAlignToAnchor(ts.textAlign),
    fontWeight: ts.fontWeight === 'bold' ? 700 : 400,
    ...(textDecoration ? { textDecoration } : {})
  }
}

export function readNodeProperties(lf: LogicFlow, nodeId: string): DiagramNodeProperties | null {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return null

  const style = model.getNodeStyle() as Record<string, unknown>
  const lfTextStyle = model.getTextStyle() as Record<string, unknown>
  const textStyleRaw = (model.properties?.textStyle ?? {}) as Record<string, unknown>
  const mergedText = { ...lfTextStyle, ...textStyleRaw }
  const decoration = String(mergedText.textDecoration ?? '')

  const textStyle: DiagramNodeTextStyle = {
    fontSize: Number(mergedText.fontSize ?? 12),
    color: String(mergedText.fill ?? mergedText.color ?? '#121214'),
    textAlign: anchorToTextAlign(String(mergedText.textAnchor ?? 'middle')),
    fontWeight:
      mergedText.fontWeight === 'bold' || mergedText.fontWeight === 700 ? 'bold' : 'normal',
    underline: decoration.includes('underline'),
    strikethrough: decoration.includes('line-through')
  }

  const imageRaw = readNodeImageAsset(model.properties as Record<string, unknown>)
  const imageAsset: DiagramNodeImageAsset | null = imageRaw
    ? { ...imageRaw, url: imageRaw.url || '' }
    : null

  return {
    id: nodeId,
    type: String(model.type ?? ''),
    text: nodeTextValue(model.text),
    textStyle,
    x: Math.round(model.x),
    y: Math.round(model.y),
    width: Math.round(model.width),
    height: Math.round(model.height),
    fill: String(style.fill ?? '#ffffff'),
    stroke: String(style.stroke ?? '#d0d0d4'),
    strokeWidth: Number(style.strokeWidth ?? 1),
    shadow: readShadowPreset(model.properties as Record<string, unknown>),
    imageAsset
  }
}

export function readEdgeProperties(lf: LogicFlow, edgeId: string): DiagramEdgeProperties | null {
  const model = lf.getEdgeModelById(edgeId)
  if (!model) return null

  const style = model.getEdgeStyle() as Record<string, unknown>
  const arrow = model.getArrowStyle() as Record<string, unknown>

  return {
    id: edgeId,
    type: (model.type as DiagramEdgeProperties['type']) ?? 'polyline',
    stroke: String(style.stroke ?? '#5a5a62'),
    strokeWidth: Number(style.strokeWidth ?? 1.5),
    strokeDasharray: String(style.strokeDasharray ?? ''),
    startArrowType: (arrow.startArrowType as DiagramArrowType) ?? 'none',
    endArrowType: (arrow.endArrowType as DiagramArrowType) ?? 'solid',
    text: nodeTextValue(model.text)
  }
}

export function applyNodeProperties(lf: LogicFlow, props: Partial<DiagramNodeProperties> & { id: string }): void {
  const model = lf.getNodeModelById(props.id)
  if (!model) return

  if (typeof props.text === 'string') {
    model.updateText(props.text)
  }

  if (props.textStyle) {
    const existing = (model.properties?.textStyle ?? {}) as Record<string, unknown>
    lf.setProperties(props.id, {
      textStyle: { ...existing, ...buildLfTextStyle(props.textStyle) }
    })
  }

  if (props.x != null) model.x = props.x
  if (props.y != null) model.y = props.y
  if (props.width != null) model.width = props.width
  if (props.height != null) model.height = props.height

  const stylePatch: Record<string, unknown> = {}
  if (props.fill != null) stylePatch.fill = props.fill
  if (props.stroke != null) stylePatch.stroke = props.stroke
  if (props.strokeWidth != null) stylePatch.strokeWidth = props.strokeWidth

  if (props.shadow != null) {
    const shadow = shadowStyleForPreset(props.shadow)
    if (shadow) stylePatch.shadow = shadow
    else delete (model.style as Record<string, unknown>).shadow
    lf.setProperties(props.id, { shadowPreset: props.shadow })
  }

  if (Object.keys(stylePatch).length) {
    model.setStyles(stylePatch)
  }

  if ('imageAsset' in props) {
    if (props.imageAsset) {
      lf.setProperties(props.id, {
        dgAssetId: props.imageAsset.assetId,
        dgAssetExt: props.imageAsset.ext,
        dgAssetUrl: props.imageAsset.url
      })
    } else {
      lf.setProperties(props.id, {
        dgAssetId: undefined,
        dgAssetExt: undefined,
        dgAssetUrl: undefined
      })
    }
  }
}

export function applyEdgeProperties(lf: LogicFlow, props: Partial<DiagramEdgeProperties> & { id: string }): void {
  const model = lf.getEdgeModelById(props.id)
  if (!model) return

  if (props.type && props.type !== model.type) {
    lf.changeEdgeType(props.id, props.type)
  }

  if (typeof props.text === 'string') {
    model.updateText(props.text)
  }

  const stylePatch: Record<string, unknown> = {}
  if (props.stroke != null) stylePatch.stroke = props.stroke
  if (props.strokeWidth != null) stylePatch.strokeWidth = props.strokeWidth
  if (props.strokeDasharray != null) stylePatch.strokeDasharray = props.strokeDasharray || undefined
  if (props.startArrowType != null) stylePatch.startArrowType = props.startArrowType
  if (props.endArrowType != null) stylePatch.endArrowType = props.endArrowType

  if (Object.keys(stylePatch).length) {
    const edge = lf.getEdgeModelById(props.id)
    edge?.setStyles(stylePatch)
  }
}
