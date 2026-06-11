import LogicFlow, { h } from '@logicflow/core'
import {
  DiagramRectResizeModel,
  DiagramRectResizeView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import {
  applyDefaultRectSize,
  syncNodeSizeProperties
} from '@modules/library/diagrams/lib/diagramShapeResize'
import { readUmlClassifierData } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierFormat'
import {
  applyUmlClassifierLayoutToModel,
  computeUmlClassifierLayout,
  truncateUmlCanvasLine,
  UML_LAYOUT,
  type UmlLayoutHitTarget,
  type UmlLayoutLine
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierLayout'
import { DG_SHAPE_RENDER_REV_KEY } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { DG_SHAPE_HIT_EVENT } from '@modules/library/diagrams/domain/shape-extension/types'
import { UML_CLASSIFIER_KIND } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'
import { textXForAlign } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramNodeTextStyle } from '@modules/library/diagrams/lib/diagramSelectionTypes'

const UML_CLASSIFIER_LF_TYPES = ['dg-uml-class', 'dg-uml-interface'] as const
const UML_MEMBER_FONT_SIZE = 11
const UML_STEREOTYPE_FONT_SIZE = 10
const hitClickTimers = new WeakMap<DiagramRectResizeModel, ReturnType<typeof setTimeout>>()
let umlHitEmitGeneration = 0

export function cancelPendingUmlClassifierHitClick(model: DiagramRectResizeModel): void {
  const pending = hitClickTimers.get(model)
  if (pending) {
    clearTimeout(pending)
    hitClickTimers.delete(model)
  }
}

export function cancelAllPendingUmlClassifierHitClicks(lf: LogicFlow): void {
  umlHitEmitGeneration += 1
  for (const model of lf.graphModel.nodes) {
    if (!UML_CLASSIFIER_LF_TYPES.includes(String(model.type) as (typeof UML_CLASSIFIER_LF_TYPES)[number])) {
      continue
    }
    cancelPendingUmlClassifierHitClick(model as DiagramRectResizeModel)
  }
}

function isUmlNameLine(line: UmlLayoutLine): boolean {
  return line.role === 'name'
}

function isUmlStereotypeLine(line: UmlLayoutLine): boolean {
  return line.role === 'stereotype'
}

function isUmlPlaceholderLine(line: UmlLayoutLine): boolean {
  return line.hit?.region === 'attributes-add' || line.hit?.region === 'operations-add'
}

function readTitleTextAlign(model: DiagramRectResizeModel): DiagramNodeTextStyle['textAlign'] {
  const propsStyle = (model.properties?.textStyle ?? {}) as Record<string, unknown>
  const align = propsStyle.textAlign
  if (align === 'left' || align === 'center' || align === 'right') return align
  const lfTextStyle = model.getTextStyle() as Record<string, unknown>
  const anchor = String(lfTextStyle.textAnchor ?? 'middle')
  if (anchor === 'start') return 'left'
  if (anchor === 'end') return 'right'
  return 'center'
}

function textAnchorForAlign(align: DiagramNodeTextStyle['textAlign']): 'start' | 'middle' | 'end' {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'middle'
}

function readTitleFontWeight(textStyle: Record<string, unknown>): number {
  const weight = textStyle.fontWeight
  if (weight === 'bold' || weight === 700) return 700
  if (weight === 'normal' || weight === 400) return 400
  if (typeof weight === 'number') return weight
  return 700
}

function readTitleTextDecoration(textStyle: Record<string, unknown>): string {
  const existing = String(textStyle.textDecoration ?? '').trim()
  if (existing) return existing
  const parts: string[] = []
  if (textStyle.underline) parts.push('underline')
  if (textStyle.strikethrough) parts.push('line-through')
  return parts.length ? parts.join(' ') : 'none'
}

function applyDefaultUmlTitleTextStyle(model: DiagramRectResizeModel): void {
  const props = (model.properties ?? {}) as Record<string, unknown>
  const ts = (props.textStyle ?? {}) as Record<string, unknown>
  const next = { ...ts }
  let changed = false
  if (next.textAlign == null) {
    next.textAlign = 'center'
    changed = true
  }
  if (next.fontWeight == null) {
    next.fontWeight = 700
    changed = true
  }
  if (changed) {
    model.setProperties({ textStyle: next })
  }
}

function emitUmlClassifierHit(
  model: DiagramRectResizeModel,
  hit: UmlLayoutHitTarget,
  event?: MouseEvent
): void {
  model.graphModel.eventCenter.emit(DG_SHAPE_HIT_EVENT, {
    nodeId: model.id,
    kind: UML_CLASSIFIER_KIND,
    hit,
    append: Boolean(event?.ctrlKey || event?.metaKey || event?.shiftKey)
  })
}

/** 单击：不阻断 LF 冒泡；延迟 emit 以便选区先稳定，可用 generation 取消过期 hit */
function onUmlClassifierHitClick(
  model: DiagramRectResizeModel,
  hit: UmlLayoutHitTarget,
  event: MouseEvent
): void {
  cancelPendingUmlClassifierHitClick(model)
  const generation = umlHitEmitGeneration
  queueMicrotask(() => {
    if (generation !== umlHitEmitGeneration) return
    emitUmlClassifierHit(model, hit, event)
  })
}

/** 双击：立即触发并取消待处理单击 */
function onUmlClassifierHitDblClick(
  model: DiagramRectResizeModel,
  hit: UmlLayoutHitTarget,
  event: MouseEvent
): void {
  const pending = hitClickTimers.get(model)
  if (pending) {
    clearTimeout(pending)
    hitClickTimers.delete(model)
  }
  emitUmlClassifierHit(model, hit, event)
}

/** 内容最小尺寸（不含用户手动放大的宽高）；minWidth 不得用 max(当前宽, 内容宽) 否则放大后无法缩小 */
function appendPackageTab(
  shapes: unknown[],
  left: number,
  top: number,
  width: number,
  style: Record<string, unknown>
): void {
  const tabW = Math.min(44, width * 0.32)
  const tabH = 10
  shapes.push(
    h('rect', {
      x: left + 3,
      y: top + 3,
      width: tabW,
      height: tabH,
      fill: style.fill,
      stroke: style.stroke,
      strokeWidth: style.strokeWidth,
      rx: 1,
      ry: 1
    })
  )
}

function appendComponentTabs(
  shapes: unknown[],
  left: number,
  top: number,
  width: number,
  height: number,
  style: Record<string, unknown>
): void {
  const tabW = UML_LAYOUT.COMPONENT_TAB_W
  const tabH = Math.min(height * 0.4, 32)
  const tabY = top + (height - tabH) / 2
  const tabProps = {
    fill: style.fill,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    rx: 1,
    ry: 1
  }
  shapes.push(
    h('rect', { ...tabProps, x: left + 3, y: tabY, width: tabW, height: tabH }),
    h('rect', { ...tabProps, x: left + width - tabW - 3, y: tabY, width: tabW, height: tabH })
  )
}

function syncUmlClassifierLayout(model: DiagramRectResizeModel): void {
  const data = readUmlClassifierData(model)
  if (!data) return
  if (applyUmlClassifierLayoutToModel(model, data)) {
    syncNodeSizeProperties(model)
  }
}

export function registerUmlClassifierShapes(lf: LogicFlow): void {
  for (const type of UML_CLASSIFIER_LF_TYPES) {
    class UmlClassifierModel extends DiagramRectResizeModel {
      private _umlResizing = false

      initNodeData(data: LogicFlow.NodeConfig) {
        super.initNodeData(data)
        applyDefaultRectSize(this, data, { width: 140, height: 72, radius: 2 })
        this.minWidth = 80
        this.minHeight = 48
        applyDefaultUmlTitleTextStyle(this)
        syncUmlClassifierLayout(this)
      }

      setAttributes() {
        super.setAttributes()
        if (!this._umlResizing) {
          syncUmlClassifierLayout(this)
        }
      }

      resize(resizeInfo: Parameters<DiagramRectResizeModel['resize']>[0]) {
        this._umlResizing = true
        try {
          return super.resize(resizeInfo)
        } finally {
          this._umlResizing = false
        }
      }
    }

    class UmlClassifierView extends DiagramRectResizeView {
      getText() {
        return h('g', {})
      }

      getResizeShape() {
        const { model } = this.props
        const props = model.properties as Record<string, unknown> | undefined
        void Number(props?.[DG_SHAPE_RENDER_REV_KEY] ?? 0)
        const data = readUmlClassifierData(model)
        // 显式订阅 dgShape 成员变更，供 MobX observer 追踪重绘
        void data?.name
        void data?.showAttributes
        void data?.showOperations
        void data?.attributes.length
        void data?.operations.length
        const { x, y, width, height, radius } = model
        const style = model.getNodeStyle()
        const left = x - width / 2
        const top = y - height / 2
        const layout = data ? computeUmlClassifierLayout(data, width) : null
        const textStyle = model.getTextStyle() as Record<string, unknown>
        const titleFontSize = Number(textStyle.fontSize ?? 12)
        const titleFill = String(textStyle.fill ?? textStyle.color ?? '#121214')
        const titleAlign = readTitleTextAlign(model)
        const titleX = textXForAlign(model, titleAlign)
        const titleAnchor = textAnchorForAlign(titleAlign)
        const titleFontWeight = readTitleFontWeight(textStyle)
        const titleDecoration = readTitleTextDecoration(textStyle)
        const titleFontStyle =
          textStyle.fontStyle === 'italic' || textStyle.fontStyle === 'oblique' ? 'italic' : 'normal'
        const titleFontFamily = String(textStyle.fontFamily ?? '').trim()

        const shapes: unknown[] = [
          h('rect', {
            ...style,
            x: left,
            y: top,
            width,
            height,
            rx: radius,
            ry: radius
          })
        ]

        if (data?.classifierKind === 'package') {
          appendPackageTab(shapes, left, top, width, style)
        } else if (data?.classifierKind === 'component') {
          appendComponentTabs(shapes, left, top, width, height, style)
        }

        if (layout) {
          for (const line of layout.renderLines) {
            if (line.kind === 'divider') {
              shapes.push(
                h('line', {
                  x1: left,
                  y1: top + line.y,
                  x2: left + width,
                  y2: top + line.y,
                  stroke: style.stroke,
                  strokeWidth: style.strokeWidth
                })
              )
            } else if (line.text?.trim()) {
              const isPlaceholder = isUmlPlaceholderLine(line)
              const isName = isUmlNameLine(line)
              const isStereotype = isUmlStereotypeLine(line)
              const textAttrs: Record<string, unknown> = {
                y: top + line.y,
                dominantBaseline: 'middle'
              }

              if (isStereotype) {
                Object.assign(textAttrs, {
                  x: titleX,
                  fill: titleFill,
                  fontSize: UML_STEREOTYPE_FONT_SIZE,
                  fontWeight: 400,
                  fontStyle: 'normal',
                  textDecoration: 'none',
                  textAnchor: titleAnchor,
                  class: 'dg-uml-stereotype-text',
                  ...(titleFontFamily ? { fontFamily: titleFontFamily } : {})
                })
              } else if (isName) {
                Object.assign(textAttrs, {
                  x: titleX,
                  fill: titleFill,
                  fontSize: titleFontSize,
                  fontWeight: titleFontWeight,
                  fontStyle: line.italic ? 'italic' : titleFontStyle,
                  textDecoration: titleDecoration,
                  textAnchor: titleAnchor,
                  class: 'dg-uml-title-text',
                  ...(titleFontFamily ? { fontFamily: titleFontFamily } : {})
                })
              } else if (isPlaceholder) {
                Object.assign(textAttrs, {
                  x: left + 8,
                  fontSize: UML_MEMBER_FONT_SIZE,
                  fontWeight: 400,
                  fontStyle: 'normal',
                  textDecoration: 'none',
                  textAnchor: 'start',
                  class: 'dg-uml-placeholder'
                })
              } else {
                Object.assign(textAttrs, {
                  x: left + 8,
                  fontSize: UML_MEMBER_FONT_SIZE,
                  fontWeight: 400,
                  fontStyle: line.italic ? 'italic' : 'normal',
                  textDecoration: line.underline ? 'underline' : 'none',
                  textAnchor: 'start',
                  class: 'dg-uml-member-text'
                })
              }

              const displayText = isPlaceholder
                ? line.text
                : truncateUmlCanvasLine(line.text ?? '', width)
              shapes.push(h('text', textAttrs, displayText))
              if (line.hit && line.hitTop != null && line.hitHeight != null) {
                shapes.push(
                  h('rect', {
                    x: left,
                    y: top + line.hitTop,
                    width,
                    height: line.hitHeight,
                    fill: 'transparent',
                    stroke: 'none',
                    class: 'dg-uml-hit',
                    onClick: (e: MouseEvent) => onUmlClassifierHitClick(model, line.hit!, e),
                    onDblClick: (e: MouseEvent) => onUmlClassifierHitDblClick(model, line.hit!, e)
                  })
                )
              }
            }
          }
        } else {
          const headerY = top + height * 0.3
          shapes.push(
            h('line', {
              x1: left,
              y1: headerY,
              x2: left + width,
              y2: headerY,
              stroke: style.stroke,
              strokeWidth: style.strokeWidth
            })
          )
        }

        return h('g', {}, shapes as never)
      }
    }

    lf.register({ type, view: UmlClassifierView, model: UmlClassifierModel } as never)
  }
}
