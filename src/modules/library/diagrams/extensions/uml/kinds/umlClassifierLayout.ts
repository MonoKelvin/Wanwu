import {
  classifierStereotype,
  formatUmlAttributeLine,
  formatUmlOperationLine,
  isClassifierNameItalic
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierFormat'
import type { UmlClassifierData } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

export const UML_LAYOUT = {
  MIN_WIDTH: 120,
  MIN_HEIGHT: 48,
  PAD_X: 8,
  ROW_H: 16,
  HEADER_PAD: 6,
  STEREOTYPE_H: 14,
  NAME_H: 18,
  SECTION_PAD: 4,
  CHAR_W: 6.2
} as const

export type UmlLayoutHitTarget =
  | { region: 'name' }
  | { region: 'attribute'; memberId: string; index: number }
  | { region: 'operation'; memberId: string; index: number }
  | { region: 'attributes-add' }
  | { region: 'operations-add' }

export interface UmlLayoutLine {
  kind: 'text' | 'divider'
  y: number
  text?: string
  italic?: boolean
  underline?: boolean
  hit?: UmlLayoutHitTarget
  /** 行中心距节点顶边的距离，用于命中检测 */
  hitTop?: number
  hitHeight?: number
}

export interface UmlClassifierLayout {
  width: number
  height: number
  renderLines: UmlLayoutLine[]
}

function estimateTextWidth(text: string): number {
  return Math.max(UML_LAYOUT.MIN_WIDTH - UML_LAYOUT.PAD_X * 2, text.length * UML_LAYOUT.CHAR_W)
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
    lines.push({ kind: 'text', y: y + UML_LAYOUT.STEREOTYPE_H / 2, text: stereotype })
    contentMaxW = Math.max(contentMaxW, estimateTextWidth(stereotype))
    y += UML_LAYOUT.STEREOTYPE_H
  }

  const name = data.name?.trim() || 'ClassName'
  lines.push({
    kind: 'text',
    y: y + UML_LAYOUT.NAME_H / 2,
    text: name,
    italic: isClassifierNameItalic(data),
    hit: { region: 'name' },
    hitTop: y,
    hitHeight: UML_LAYOUT.NAME_H
  })
  contentMaxW = Math.max(contentMaxW, estimateTextWidth(name))
  y += UML_LAYOUT.NAME_H + UML_LAYOUT.SECTION_PAD

  const headerBottom = y
  lines.push({ kind: 'divider', y: headerBottom })

  if (data.showAttributes) {
    y += UML_LAYOUT.SECTION_PAD
    const attrs = data.attributes
    if (!attrs.length) {
      lines.push({
        kind: 'text',
        y: y + UML_LAYOUT.ROW_H / 2,
        text: '  + 添加属性',
        hit: { region: 'attributes-add' },
        hitTop: y,
        hitHeight: UML_LAYOUT.ROW_H
      })
      y += UML_LAYOUT.ROW_H
    } else {
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i]
        const text = formatUmlAttributeLine(attr)
        lines.push({
          kind: 'text',
          y: y + UML_LAYOUT.ROW_H / 2,
          text,
          underline: attr.isStatic,
          hit: { region: 'attribute', memberId: attr.id, index: i },
          hitTop: y,
          hitHeight: UML_LAYOUT.ROW_H
        })
        contentMaxW = Math.max(contentMaxW, estimateTextWidth(text))
        y += UML_LAYOUT.ROW_H
      }
    }
    y += UML_LAYOUT.SECTION_PAD
    lines.push({ kind: 'divider', y })
  }

  if (data.showOperations) {
    y += UML_LAYOUT.SECTION_PAD
    const ops = data.operations
    if (!ops.length) {
      lines.push({
        kind: 'text',
        y: y + UML_LAYOUT.ROW_H / 2,
        text: '  + 添加操作',
        hit: { region: 'operations-add' },
        hitTop: y,
        hitHeight: UML_LAYOUT.ROW_H
      })
      y += UML_LAYOUT.ROW_H
    } else {
      for (let i = 0; i < ops.length; i++) {
        const op = ops[i]
        const text = formatUmlOperationLine(op)
        lines.push({
          kind: 'text',
          y: y + UML_LAYOUT.ROW_H / 2,
          text,
          italic: op.isAbstract,
          underline: op.isStatic,
          hit: { region: 'operation', memberId: op.id, index: i },
          hitTop: y,
          hitHeight: UML_LAYOUT.ROW_H
        })
        contentMaxW = Math.max(contentMaxW, estimateTextWidth(text))
        y += UML_LAYOUT.ROW_H
      }
    }
    y += UML_LAYOUT.SECTION_PAD
  }

  const computedWidth = Math.max(width, Math.ceil(contentMaxW + UML_LAYOUT.PAD_X * 2), UML_LAYOUT.MIN_WIDTH)
  const height = Math.max(y + UML_LAYOUT.HEADER_PAD, UML_LAYOUT.MIN_HEIGHT)

  return { width: computedWidth, height, renderLines: lines }
}
