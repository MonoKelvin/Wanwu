import LogicFlow, { BaseNodeModel } from '@logicflow/core'
import { readNodeShapeExtension } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import type { DiagramArrowType, DiagramShadowPreset } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { shadowStyleForPreset } from '@modules/library/diagrams/lib/diagramCanvasPresets'
import { readNodeImageAsset } from '@modules/library/diagrams/lib/diagramAssetRefs'
import {
  DIAGRAM_GROUP_FRAME_TYPE,
  readGroupAlwaysVisible,
  readGroupStyle,
  resolveGroupFrameIdForElement
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { cssFontFamilyStack } from '@shared/lib/fontCatalog'
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

const TEXT_ALIGN_PAD = 8
/** 图元内文本换行相对宽度的左右留白 */
export const NODE_TEXT_WRAP_X_PAD = 16

export function nodeTextWrapWidth(model: { width: number; type?: string }): number {
  const w = model.width
  const type = String(model.type ?? '')
  if (type.includes('diamond') || type === 'diamond') {
    return Math.max(24, Math.round(w * 0.55))
  }
  if (
    type.includes('ellipse') ||
    type.includes('circle') ||
    type === 'dg-cloud' ||
    type === 'dg-xor-gateway'
  ) {
    return Math.max(24, Math.round(w * 0.72))
  }
  return Math.max(24, Math.round(w - NODE_TEXT_WRAP_X_PAD))
}

function resolveLfFontSize(value: unknown, fallback = 12): number {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(128, Math.max(8, n))
}

/** LogicFlow 节点文本：按图元宽度自动换行（overflowMode: autoWrap） */
export function buildDiagramNodeTextStyle(model: BaseNodeModel): LogicFlow.NodeTextTheme {
  const nodeText = model.graphModel.theme.nodeText
  const propsStyle = (model.properties?.textStyle ?? {}) as Record<string, unknown>
  const ink = propsStyle.fill ?? propsStyle.color ?? nodeText.fill ?? nodeText.color
  return {
    ...nodeText,
    ...propsStyle,
    fontSize: resolveLfFontSize(propsStyle.fontSize ?? nodeText.fontSize),
    overflowMode:
      propsStyle.overflowMode === 'default' ||
      propsStyle.overflowMode === 'autoWrap' ||
      propsStyle.overflowMode === 'ellipsis'
        ? propsStyle.overflowMode
        : 'autoWrap',
    textWidth:
      typeof propsStyle.textWidth === 'number' ? propsStyle.textWidth : nodeTextWrapWidth(model),
    wrapPadding: String(propsStyle.wrapPadding ?? '4, 8'),
    lineHeight:
      typeof propsStyle.lineHeight === 'number'
        ? propsStyle.lineHeight
        : typeof nodeText.lineHeight === 'number'
          ? nodeText.lineHeight
          : 1.2,
    ...(ink != null ? { fill: ink, color: ink } : {})
  }
}

function buildLfTextStyle(ts: Partial<DiagramNodeTextStyle>): Record<string, unknown> {
  const textDecoration = [ts.underline ? 'underline' : '', ts.strikethrough ? 'line-through' : '']
    .filter(Boolean)
    .join(' ')

  const out: Record<string, unknown> = {}
  if (ts.fontSize != null) {
    out.fontSize = Math.min(128, Math.max(8, ts.fontSize))
  }
  if (ts.color != null) {
    out.fill = ts.color
    out.color = ts.color
  }
  if (ts.textAlign != null) {
    out.textAlign = ts.textAlign
    out.textAnchor = textAlignToAnchor(ts.textAlign)
  }
  if (ts.fontWeight != null) {
    out.fontWeight = ts.fontWeight === 'bold' ? 700 : 400
  }
  if (ts.fontStyle != null) {
    out.fontStyle = ts.fontStyle === 'italic' ? 'italic' : 'normal'
  }
  if (ts.fontFamily != null) {
    const stack = cssFontFamilyStack(ts.fontFamily)
    if (stack) out.fontFamily = stack
    else out.fontFamily = ''
  }
  if (textDecoration) out.textDecoration = textDecoration
  else if (ts.underline === false && ts.strikethrough === false) out.textDecoration = ''
  return out
}

function readTextAlignFromModel(model: BaseNodeModel): DiagramNodeTextStyle['textAlign'] {
  const propsStyle = (model.properties?.textStyle ?? {}) as Record<string, unknown>
  const align = propsStyle.textAlign
  if (align === 'left' || align === 'center' || align === 'right') return align
  const lfTextStyle = model.getTextStyle() as Record<string, unknown>
  return anchorToTextAlign(String(lfTextStyle.textAnchor ?? 'middle'))
}

export function textXForAlign(
  model: { x: number; width: number },
  align: DiagramNodeTextStyle['textAlign']
): number {
  const left = model.x - model.width / 2
  const right = model.x + model.width / 2
  if (align === 'left') return left + TEXT_ALIGN_PAD
  if (align === 'right') return right - TEXT_ALIGN_PAD
  return model.x
}

/** 按对齐方式更新文本锚点坐标（LogicFlow 仅 textAnchor 无法在图元内对齐） */
export function syncNodeTextLayout(model: BaseNodeModel): void {
  if (!model.text) return
  const style = model.getTextStyle() as Record<string, unknown>
  if (style.overflowMode === 'autoWrap') {
    model.text = { ...(model.text as object), x: model.x, y: model.y } as typeof model.text
    return
  }
  const align = readTextAlignFromModel(model)
  const x = textXForAlign(model, align)
  model.text = { ...(model.text as object), x, y: model.y } as typeof model.text
}

function buildNodeAppearanceStyle(
  props: Partial<DiagramNodeProperties>
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  if (props.fill != null) patch.fill = props.fill
  if (props.stroke != null) patch.stroke = props.stroke
  if (props.strokeWidth != null) patch.strokeWidth = props.strokeWidth
  if (props.strokeDasharray != null) patch.strokeDasharray = props.strokeDasharray || undefined
  return Object.keys(patch).length ? patch : null
}

function buildEdgeAppearanceStyle(
  props: Partial<DiagramEdgeProperties>
): Record<string, unknown> | null {
  const patch: Record<string, unknown> = {}
  if (props.stroke != null) patch.stroke = props.stroke
  if (props.strokeWidth != null) patch.strokeWidth = props.strokeWidth
  if (props.strokeDasharray != null) patch.strokeDasharray = props.strokeDasharray || undefined
  if (props.startArrowType != null) patch.startArrowType = props.startArrowType
  if (props.endArrowType != null) patch.endArrowType = props.endArrowType
  return Object.keys(patch).length ? patch : null
}

/** 将根级 fill/stroke 等迁移到 properties.style，兼容 draw.io 导入与旧数据 */
export function normalizeNodeStyleProperties(
  properties: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!properties) return {}
  const props = { ...properties }
  const style = { ...((props.style as Record<string, unknown> | undefined) ?? {}) }
  let touched = false
  for (const key of ['fill', 'stroke', 'strokeWidth', 'strokeDasharray'] as const) {
    if (props[key] != null) {
      style[key] = props[key]
      delete props[key]
      touched = true
    }
  }
  if (touched || Object.keys(style).length) props.style = style
  return props
}

export function normalizeEdgeStyleProperties(
  properties: Record<string, unknown> | undefined
): Record<string, unknown> {
  if (!properties) return {}
  const props = { ...properties }
  const style = { ...((props.style as Record<string, unknown> | undefined) ?? {}) }
  let touched = false
  for (const key of [
    'stroke',
    'strokeWidth',
    'strokeDasharray',
    'startArrowType',
    'endArrowType'
  ] as const) {
    if (props[key] != null) {
      style[key] = props[key]
      delete props[key]
      touched = true
    }
  }
  if (touched || Object.keys(style).length) props.style = style
  return props
}

export function readNodeProperties(lf: LogicFlow, nodeId: string): DiagramNodeProperties | null {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return null

  const propsStyle = (model.properties?.style ?? {}) as Record<string, unknown>
  const style = model.getNodeStyle() as Record<string, unknown>
  const lfTextStyle = model.getTextStyle() as Record<string, unknown>
  const textStyleRaw = (model.properties?.textStyle ?? {}) as Record<string, unknown>
  const mergedText = { ...lfTextStyle, ...textStyleRaw }
  const decoration = String(mergedText.textDecoration ?? '')

  const rawFontFamily = String(mergedText.fontFamily ?? '').replace(/^["']|["']$/g, '').trim()

  const textStyle: DiagramNodeTextStyle = {
    fontSize: Number(mergedText.fontSize ?? 12),
    color: String(mergedText.fill ?? mergedText.color ?? '#121214'),
    fontFamily: rawFontFamily,
    textAlign: readTextAlignFromModel(model),
    fontWeight:
      mergedText.fontWeight === 'bold' || mergedText.fontWeight === 700 ? 'bold' : 'normal',
    fontStyle: mergedText.fontStyle === 'italic' ? 'italic' : 'normal',
    underline: decoration.includes('underline'),
    strikethrough: decoration.includes('line-through')
  }

  const imageRaw = readNodeImageAsset(model.properties as Record<string, unknown>)
  const imageAsset: DiagramNodeImageAsset | null = imageRaw
    ? { ...imageRaw, url: imageRaw.url || '' }
    : null

  if (model.type === DIAGRAM_GROUP_FRAME_TYPE) {
    const gs = readGroupStyle(model.properties as Record<string, unknown>)
    const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
    const groupEdges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
    return {
      id: nodeId,
      type: DIAGRAM_GROUP_FRAME_TYPE,
      text: '',
      textStyle: {
        fontSize: 12,
        color: '#121214',
        fontFamily: '',
        textAlign: 'center',
        fontWeight: 'normal',
        fontStyle: 'normal',
        underline: false,
        strikethrough: false
      },
      x: Math.round(model.x),
      y: Math.round(model.y),
      width: Math.round(model.width),
      height: Math.round(model.height),
      fill: gs.fill,
      stroke: gs.stroke,
      strokeWidth: gs.strokeWidth,
      strokeDasharray: gs.strokeDasharray,
      shadow: 'none',
      imageAsset: null,
      groupMemberCount: members.length,
      groupEdgeCount: groupEdges.length,
      groupAlwaysVisible: readGroupAlwaysVisible(model.properties as Record<string, unknown>)
    }
  }

  return {
    id: nodeId,
    type: String(model.type ?? ''),
    text: nodeTextValue(model.text),
    textStyle,
    x: Math.round(model.x),
    y: Math.round(model.y),
    width: Math.round(model.width),
    height: Math.round(model.height),
    fill: String(propsStyle.fill ?? style.fill ?? '#ffffff'),
    stroke: String(propsStyle.stroke ?? style.stroke ?? '#d0d0d4'),
    strokeWidth: Number(propsStyle.strokeWidth ?? style.strokeWidth ?? 1),
    strokeDasharray: String(propsStyle.strokeDasharray ?? style.strokeDasharray ?? ''),
    shadow: readShadowPreset(model.properties as Record<string, unknown>),
    imageAsset,
    groupId: resolveGroupFrameIdForElement(lf, nodeId, 'node') ?? undefined,
    shapeExtension: readNodeShapeExtension(model.properties as Record<string, unknown>)
  }
}

export function readEdgeProperties(lf: LogicFlow, edgeId: string): DiagramEdgeProperties | null {
  const model = lf.getEdgeModelById(edgeId)
  if (!model) return null

  const propsStyle = (model.properties?.style ?? {}) as Record<string, unknown>
  const style = model.getEdgeStyle() as Record<string, unknown>
  const arrow = model.getArrowStyle() as Record<string, unknown>

  return {
    id: edgeId,
    type: (model.type as DiagramEdgeProperties['type']) ?? 'polyline',
    stroke: String(propsStyle.stroke ?? style.stroke ?? '#5a5a62'),
    strokeWidth: Number(propsStyle.strokeWidth ?? style.strokeWidth ?? 1.5),
    strokeDasharray: String(propsStyle.strokeDasharray ?? style.strokeDasharray ?? ''),
    startArrowType:
      (propsStyle.startArrowType as DiagramArrowType) ??
      (arrow.startArrowType as DiagramArrowType) ??
      'none',
    endArrowType:
      (propsStyle.endArrowType as DiagramArrowType) ??
      (arrow.endArrowType as DiagramArrowType) ??
      'solid',
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
    const merged = { ...existing, ...buildLfTextStyle(props.textStyle) }
    lf.setProperties(props.id, { textStyle: merged })
    if ('setAttributes' in model && typeof model.setAttributes === 'function') {
      ;(model as { setAttributes: () => void }).setAttributes()
    }
    syncNodeTextLayout(model)
    const currentText = nodeTextValue(model.text)
    if (currentText !== '') {
      model.updateText(currentText)
    }
  }

  if (props.x != null || props.y != null) {
    const nx = props.x ?? model.x
    const ny = props.y ?? model.y
    const dx = nx - model.x
    const dy = ny - model.y
    if (dx !== 0 || dy !== 0) {
      lf.graphModel.moveNode(props.id, dx, dy, true)
      syncNodeTextLayout(model)
    }
  }
  if (props.width != null || props.height != null) {
    const left = model.x - model.width / 2
    const top = model.y - model.height / 2
    const newW = props.width ?? Math.round(model.width)
    const newH = props.height ?? Math.round(model.height)
    applyNodeDimensions(
      model as Parameters<typeof applyNodeDimensions>[0],
      newW,
      newH
    )
    if (props.x == null && props.y == null) {
      const nx = left + newW / 2
      const ny = top + newH / 2
      const dx = nx - model.x
      const dy = ny - model.y
      if (dx !== 0 || dy !== 0) lf.graphModel.moveNode(props.id, dx, dy, true)
    }
    syncNodeTextLayout(model)
  }

  const appearanceStyle = buildNodeAppearanceStyle(props)
  if (appearanceStyle) {
    const existing = (model.properties?.style ?? {}) as Record<string, unknown>
    lf.setProperties(props.id, { style: { ...existing, ...appearanceStyle } })
    model.setStyles(appearanceStyle)
  }

  if (props.shadow != null) {
    const shadow = shadowStyleForPreset(props.shadow)
    const existing = (model.properties?.style ?? {}) as Record<string, unknown>
    const styleUpdate = { ...existing }
    if (shadow) styleUpdate.shadow = shadow
    else delete styleUpdate.shadow
    lf.setProperties(props.id, { style: styleUpdate, shadowPreset: props.shadow })
    if (shadow) model.setStyles({ shadow })
    else delete (model.style as Record<string, unknown>).shadow
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
  if (props.type) {
    const current = lf.getEdgeModelById(props.id)
    if (current && props.type !== current.type) {
      lf.changeEdgeType(props.id, props.type)
    }
  }

  const model = lf.getEdgeModelById(props.id)
  if (!model) return

  if (typeof props.text === 'string') {
    model.updateText(props.text)
  }

  const stylePatch: Record<string, unknown> = {}
  if (props.stroke != null) stylePatch.stroke = props.stroke
  if (props.strokeWidth != null) stylePatch.strokeWidth = props.strokeWidth
  if (props.strokeDasharray != null) stylePatch.strokeDasharray = props.strokeDasharray || undefined
  if (props.startArrowType != null) stylePatch.startArrowType = props.startArrowType
  if (props.endArrowType != null) stylePatch.endArrowType = props.endArrowType

  const appearanceStyle = buildEdgeAppearanceStyle(props)
  if (appearanceStyle) {
    const existing = (model.properties?.style ?? {}) as Record<string, unknown>
    lf.setProperties(props.id, { style: { ...existing, ...appearanceStyle } })
  }

  if (Object.keys(stylePatch).length) {
    model.setStyles(stylePatch)
  }
}
