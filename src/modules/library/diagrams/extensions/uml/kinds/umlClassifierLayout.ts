import {
  classifierStereotype,
  formatUmlAttributeLine,
  formatUmlOperationLine,
  isClassifierNameItalic,
  readUmlClassifierData
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierFormat'
import type { UmlClassifierData } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'
import { syncNodeSizeProperties } from '@modules/library/diagrams/lib/diagramShapeResize'

export const UML_LAYOUT = {
  MIN_WIDTH: 120,
  MIN_HEIGHT: 48,
  PAD_X: 8,
  ROW_H: 16,
  HEADER_PAD: 6,
  STEREOTYPE_H: 14,
  NAME_H: 18,
  SECTION_PAD: 4,
  CHAR_W: 6.2,
  /** 组件图元两侧耳片宽度（绘制在节点内部） */
  COMPONENT_TAB_W: 6
} as const

export interface UmlLayoutLine {
  kind: 'text' | 'divider'
  y: number
  text?: string
  role?: 'stereotype' | 'name'
  italic?: boolean
  underline?: boolean
}

export interface UmlClassifierLayout {
  width: number
  height: number
  minWidth: number
  minHeight: number
  renderLines: UmlLayoutLine[]
}

export interface UmlClassifierLayoutModel {
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  rx?: number
  ry?: number
  setProperties?: (props: Record<string, unknown>) => void
}

/** 将内容最小尺寸应用到 LF Model（仅随内容增高/增宽，不缩小用户手动放大的宽高） */
export function applyUmlClassifierLayoutToModel(
  model: UmlClassifierLayoutModel,
  data: UmlClassifierData
): boolean {
  const layout = computeUmlClassifierLayout(data, model.width)
  model.minWidth = Math.max(80, layout.minWidth)
  model.minHeight = Math.max(48, layout.minHeight)

  let changed = false
  if (model.height < layout.height - 0.5) {
    model.height = layout.height
    changed = true
  }
  if (model.width < layout.width - 0.5) {
    model.width = layout.width
    changed = true
  }
  return changed
}

/** 仅在 dgShape 内容变更后调用；勿挂到 setAttributes，避免干扰基类 resize */
export function syncUmlClassifierLayoutToNode(
  model: UmlClassifierLayoutModel & {
    properties?: Record<string, unknown>
  }
): void {
  const data = readUmlClassifierData(model)
  if (!data) return
  if (applyUmlClassifierLayoutToModel(model, data) && model.setProperties) {
    syncNodeSizeProperties({
      width: model.width,
      height: model.height,
      rx: model.rx,
      ry: model.ry,
      setProperties: (props) => model.setProperties!(props)
    })
  }
}

function charWidth(ch: string): number {
  return ch.charCodeAt(0) > 255 ? UML_LAYOUT.CHAR_W * 1.75 : UML_LAYOUT.CHAR_W
}

function estimateTextWidth(text: string): number {
  let width = 0
  for (const ch of text) {
    width += charWidth(ch)
  }
  return Math.max(UML_LAYOUT.MIN_WIDTH - UML_LAYOUT.PAD_X * 2, width)
}

/** 画布单行文本截断（成员区），避免超出节点宽度 */
export function truncateUmlCanvasLine(text: string, nodeWidth: number): string {
  const inner = nodeWidth - UML_LAYOUT.PAD_X * 2
  if (inner <= 0 || !text) return text

  let width = 0
  let cut = text.length
  for (let i = 0; i < text.length; i++) {
    const cw = charWidth(text[i]!)
    if (width + cw > inner) {
      cut = i
      break
    }
    width += cw
  }
  if (cut >= text.length) return text

  const ellipsis = '…'
  let end = cut
  while (end > 0) {
    let w = 0
    for (let j = 0; j < end; j++) w += charWidth(text[j]!)
    w += charWidth(ellipsis)
    if (w <= inner) return text.slice(0, end) + ellipsis
    end -= 1
  }
  return ellipsis
}

export function computeUmlClassifierLayout(
  data: UmlClassifierData,
  width: number = UML_LAYOUT.MIN_WIDTH
): UmlClassifierLayout {
  const lines: UmlLayoutLine[] = []
  let y = UML_LAYOUT.HEADER_PAD
  let contentMaxW = Math.max(UML_LAYOUT.MIN_WIDTH, width) - UML_LAYOUT.PAD_X * 2

  const stereotype = classifierStereotype(data.classifierKind)
  if (stereotype) {
    lines.push({
      kind: 'text',
      y: y + UML_LAYOUT.STEREOTYPE_H / 2,
      text: stereotype,
      role: 'stereotype'
    })
    contentMaxW = Math.max(contentMaxW, estimateTextWidth(stereotype))
    y += UML_LAYOUT.STEREOTYPE_H
  }

  const name = data.name?.trim() || 'ClassName'
  lines.push({
    kind: 'text',
    y: y + UML_LAYOUT.NAME_H / 2,
    text: name,
    role: 'name',
    italic: isClassifierNameItalic(data)
  })
  contentMaxW = Math.max(contentMaxW, estimateTextWidth(name))
  y += UML_LAYOUT.NAME_H + UML_LAYOUT.SECTION_PAD

  const headerBottom = y
  lines.push({ kind: 'divider', y: headerBottom })

  if (data.showAttributes) {
    y += UML_LAYOUT.SECTION_PAD
    for (const attr of data.attributes) {
      const text = formatUmlAttributeLine(attr)
      lines.push({
        kind: 'text',
        y: y + UML_LAYOUT.ROW_H / 2,
        text,
        underline: attr.isStatic
      })
      contentMaxW = Math.max(contentMaxW, estimateTextWidth(text))
      y += UML_LAYOUT.ROW_H
    }
    y += UML_LAYOUT.SECTION_PAD
    lines.push({ kind: 'divider', y })
  }

  if (data.showOperations) {
    y += UML_LAYOUT.SECTION_PAD
    for (const op of data.operations) {
      const text = formatUmlOperationLine(op)
      lines.push({
        kind: 'text',
        y: y + UML_LAYOUT.ROW_H / 2,
        text,
        italic: op.isAbstract,
        underline: op.isStatic
      })
      contentMaxW = Math.max(contentMaxW, estimateTextWidth(text))
      y += UML_LAYOUT.ROW_H
    }
    y += UML_LAYOUT.SECTION_PAD
  }

  const contentMinWidth = Math.max(
    Math.ceil(contentMaxW + UML_LAYOUT.PAD_X * 2),
    UML_LAYOUT.MIN_WIDTH
  )
  const contentHeight = Math.max(y + UML_LAYOUT.HEADER_PAD, UML_LAYOUT.MIN_HEIGHT)
  const layoutWidth = Math.max(width, contentMinWidth)

  return {
    width: layoutWidth,
    height: contentHeight,
    minWidth: contentMinWidth,
    minHeight: contentHeight,
    renderLines: lines
  }
}
