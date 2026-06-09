import { readDgShapeFromProperties } from '@modules/library/diagrams/domain/shape-extension/diagramShapePayload'
import {
  createMemberId,
  UML_CLASSIFIER_KIND,
  type UmlAttribute,
  type UmlClassifierData,
  type UmlClassifierKind,
  type UmlOperation,
  type UmlVisibility
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

const CLASSIFIER_KINDS: readonly UmlClassifierKind[] = [
  'class',
  'interface',
  'abstractClass',
  'enum'
]

const VISIBILITIES: readonly UmlVisibility[] = ['public', 'protected', 'private', 'package']

function normalizeVisibility(value: unknown): UmlVisibility {
  return VISIBILITIES.includes(value as UmlVisibility) ? (value as UmlVisibility) : 'public'
}

function normalizeAttribute(raw: unknown): UmlAttribute {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Partial<UmlAttribute>
  return {
    id: typeof item.id === 'string' && item.id ? item.id : createMemberId(),
    name: typeof item.name === 'string' ? item.name : 'field',
    visibility: normalizeVisibility(item.visibility),
    isStatic: Boolean(item.isStatic),
    type: typeof item.type === 'string' ? item.type : undefined,
    defaultValue: typeof item.defaultValue === 'string' ? item.defaultValue : undefined,
    stereotype: typeof item.stereotype === 'string' ? item.stereotype : undefined
  }
}

function normalizeOperation(raw: unknown): UmlOperation {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Partial<UmlOperation>
  const parameters = Array.isArray(item.parameters)
    ? item.parameters.map((p) => {
        const param = (p && typeof p === 'object' ? p : {}) as { name?: string; type?: string }
        return {
          name: typeof param.name === 'string' ? param.name : 'arg',
          type: typeof param.type === 'string' ? param.type : undefined
        }
      })
    : []
  return {
    id: typeof item.id === 'string' && item.id ? item.id : createMemberId(),
    name: typeof item.name === 'string' ? item.name : 'method',
    visibility: normalizeVisibility(item.visibility),
    isStatic: Boolean(item.isStatic),
    isAbstract: Boolean(item.isAbstract),
    parameters,
    returnType: typeof item.returnType === 'string' ? item.returnType : undefined,
    stereotype: typeof item.stereotype === 'string' ? item.stereotype : undefined
  }
}

/** 容错：将持久化/迁移中的脏数据规整为合法 UmlClassifierData */
export function normalizeUmlClassifierData(raw: unknown): UmlClassifierData {
  const item = (raw && typeof raw === 'object' ? raw : {}) as Partial<UmlClassifierData>
  const classifierKind = CLASSIFIER_KINDS.includes(item.classifierKind as UmlClassifierKind)
    ? (item.classifierKind as UmlClassifierKind)
    : 'class'
  return {
    classifierKind,
    name: typeof item.name === 'string' && item.name.trim() ? item.name : 'ClassName',
    attributes: Array.isArray(item.attributes) ? item.attributes.map(normalizeAttribute) : [],
    operations: Array.isArray(item.operations) ? item.operations.map(normalizeOperation) : [],
    showAttributes: item.showAttributes !== false,
    showOperations: item.showOperations !== false
  }
}

export function visibilityChar(visibility: UmlVisibility): string {
  switch (visibility) {
    case 'public':
      return '+'
    case 'protected':
      return '#'
    case 'private':
      return '-'
    case 'package':
      return '~'
    default:
      return '+'
  }
}

export function formatUmlAttributeLine(attr: UmlAttribute): string {
  const typePart = attr.type ? `: ${attr.type}` : ''
  return `${visibilityChar(attr.visibility)}${attr.name}${typePart}`
}

export function formatUmlOperationLine(op: UmlOperation): string {
  const params = op.parameters
    .map((p) => (p.type ? `${p.name}: ${p.type}` : p.name))
    .join(', ')
  const ret = op.returnType ? `: ${op.returnType}` : ''
  return `${visibilityChar(op.visibility)}${op.name}(${params})${ret}`
}

export function formatUmlAttributeExpression(attr: UmlAttribute): string {
  const staticMark = attr.isStatic ? '{static} ' : ''
  const typePart = attr.type ? `: ${attr.type}` : ''
  return `${staticMark}${visibilityChar(attr.visibility)}${attr.name}${typePart}`
}

export function formatUmlOperationExpression(op: UmlOperation): string {
  const params = op.parameters
    .map((p) => (p.type ? `${p.name}: ${p.type}` : p.name))
    .join(', ')
  const ret = op.returnType ? `: ${op.returnType}` : ''
  const staticMark = op.isStatic ? '{static} ' : ''
  const abstractMark = op.isAbstract ? '{abstract} ' : ''
  return `${staticMark}${abstractMark}${visibilityChar(op.visibility)}${op.name}(${params})${ret}`
}

function parseVisibilityPrefix(rest: string): { visibility: UmlVisibility; rest: string } {
  const match = rest.match(/^([+#!~-])\s*/)
  if (!match) return { visibility: 'public', rest }
  const char = match[1]
  const after = rest.slice(match[0].length)
  switch (char) {
    case '#':
      return { visibility: 'protected', rest: after }
    case '-':
      return { visibility: 'private', rest: after }
    case '~':
      return { visibility: 'package', rest: after }
    default:
      return { visibility: 'public', rest: after }
  }
}

function parseModifierPrefixes(rest: string): {
  isStatic: boolean
  isAbstract: boolean
  rest: string
} {
  let isStatic = false
  let isAbstract = false
  let current = rest.trim()
  while (current.startsWith('{static}')) {
    isStatic = true
    current = current.slice('{static}'.length).trim()
  }
  while (current.startsWith('{abstract}')) {
    isAbstract = true
    current = current.slice('{abstract}'.length).trim()
  }
  return { isStatic, isAbstract, rest: current }
}

export function parseUmlAttributeExpression(expr: string): Partial<UmlAttribute> {
  const trimmed = expr.trim()
  if (!trimmed) return { name: 'field' }
  const { isStatic, rest } = parseModifierPrefixes(trimmed)
  const { visibility, rest: afterVis } = parseVisibilityPrefix(rest)
  const m = afterVis.match(/^([^:]+?)(?::\s*(.+))?$/)
  return {
    visibility,
    isStatic,
    name: m?.[1]?.trim() || 'field',
    type: m?.[2]?.trim() || undefined
  }
}

export function parseUmlOperationExpression(expr: string): Partial<UmlOperation> {
  const trimmed = expr.trim()
  if (!trimmed) return { name: 'method' }
  const { isStatic, isAbstract, rest } = parseModifierPrefixes(trimmed)
  const { visibility, rest: afterVis } = parseVisibilityPrefix(rest)
  const m = afterVis.match(/^([^(]+)\(([^)]*)\)(?:\s*:\s*(.+))?$/)
  const name = m?.[1]?.trim() || 'method'
  const paramsRaw = m?.[2] ?? ''
  const returnType = m?.[3]?.trim()
  const parameters = paramsRaw
    ? paramsRaw.split(',').map((p) => {
        const seg = p.trim()
        const colon = seg.indexOf(':')
        if (colon >= 0) {
          return { name: seg.slice(0, colon).trim(), type: seg.slice(colon + 1).trim() }
        }
        return { name: seg }
      })
    : []
  return { visibility, isStatic, isAbstract, name, parameters, returnType }
}

export function formatParametersInput(op: UmlOperation): string {
  return op.parameters.map((p) => (p.type ? `${p.name}: ${p.type}` : p.name)).join(', ')
}

export function parseParametersInput(raw: string): Array<{ name: string; type?: string }> {
  if (!raw.trim()) return []
  return raw.split(',').map((p) => {
    const seg = p.trim()
    const colon = seg.indexOf(':')
    if (colon >= 0) {
      return { name: seg.slice(0, colon).trim() || 'arg', type: seg.slice(colon + 1).trim() }
    }
    return { name: seg || 'arg' }
  })
}

export function readUmlClassifierData(model: {
  properties?: Record<string, unknown>
  text?: unknown
  type?: string
}): UmlClassifierData | null {
  const envelope = readDgShapeFromProperties(model.properties as Record<string, unknown> | undefined)
  if (envelope?.kind === UML_CLASSIFIER_KIND) {
    return normalizeUmlClassifierData(envelope.data)
  }
  return null
}

export function classifierStereotype(kind: UmlClassifierData['classifierKind']): string | null {
  switch (kind) {
    case 'interface':
      return '«interface»'
    case 'abstractClass':
      return '«abstract»'
    case 'enum':
      return '«enumeration»'
    default:
      return null
  }
}

export function isClassifierNameItalic(data: UmlClassifierData): boolean {
  return data.classifierKind === 'abstractClass' || data.classifierKind === 'interface'
}
