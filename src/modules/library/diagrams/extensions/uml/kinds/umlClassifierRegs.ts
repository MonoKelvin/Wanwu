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
  computeUmlClassifierLayout,
  UML_LAYOUT,
  type UmlLayoutHitTarget,
  type UmlLayoutLine
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierLayout'
import { textXForAlign } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramNodeTextStyle } from '@modules/library/diagrams/lib/diagramSelectionTypes'

const UML_CLASSIFIER_LF_TYPES = ['dg-uml-class', 'dg-uml-interface'] as const
const UML_MEMBER_FONT_SIZE = 11

function isUmlTitleLine(line: UmlLayoutLine): boolean {
  if (line.hit?.region === 'name') return true
  if (!line.hit && line.text?.trimStart().startsWith('«')) return true
  return false
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
    model.properties = { ...props, textStyle: next }
  }
}

/** 仅双击时联动属性面板；单击留给 LogicFlow 选中节点 */
function emitUmlClassifierDblClick(
  model: DiagramRectResizeModel,
  hit: UmlLayoutHitTarget,
  event: MouseEvent
): void {
  event.stopPropagation()
  model.graphModel.eventCenter.emit('uml:classifier-hit', {
    nodeId: model.id,
    hit
  })
}

/** 内容最小尺寸（不含用户手动放大的宽高）；minWidth 不得用 max(当前宽, 内容宽) 否则放大后无法缩小 */
function syncUmlClassifierLayout(model: DiagramRectResizeModel): void {
  const data = readUmlClassifierData(model)
  if (!data) return
  const contentMin = computeUmlClassifierLayout(data, UML_LAYOUT.MIN_WIDTH)
  model.minWidth = Math.max(80, contentMin.width)
  model.minHeight = Math.max(48, contentMin.height)

  let changed = false
  if (model.height < contentMin.height - 0.5) {
    model.height = contentMin.height
    changed = true
  }
  if (model.width < contentMin.width - 0.5) {
    model.width = contentMin.width
    changed = true
  }
  if (changed) {
    syncNodeSizeProperties(model)
  }
}

export function registerUmlClassifierShapes(lf: LogicFlow): void {
  for (const type of UML_CLASSIFIER_LF_TYPES) {
    class UmlClassifierModel extends DiagramRectResizeModel {
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
        syncUmlClassifierLayout(this)
      }

    }

    class UmlClassifierView extends DiagramRectResizeView {
      getText() {
        return h('g', {})
      }

      getResizeShape() {
        const { model } = this.props
        const { x, y, width, height, radius } = model
        const style = model.getNodeStyle()
        const left = x - width / 2
        const top = y - height / 2
        const data = readUmlClassifierData(model)
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
              const isTitle = isUmlTitleLine(line)
              const textAttrs: Record<string, unknown> = {
                y: top + line.y,
                dominantBaseline: 'middle'
              }

              if (isTitle) {
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

              shapes.push(h('text', textAttrs, line.text))
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
                    onDblClick: (e: MouseEvent) => emitUmlClassifierDblClick(model, line.hit!, e)
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
