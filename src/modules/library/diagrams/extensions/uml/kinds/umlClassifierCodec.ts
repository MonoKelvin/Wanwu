import type LogicFlow from '@logicflow/core'
import type { IDiagramShapePayloadCodec } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
import {
  classifierStereotype,
  formatUmlAttributeLine,
  formatUmlOperationLine,
  normalizeUmlClassifierData
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierFormat'
import {
  computeUmlClassifierLayout,
  syncUmlClassifierLayoutToNode
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierLayout'
import {
  createMemberId,
  UML_CLASSIFIER_KIND,
  type UmlClassifierData,
  type UmlClassifierKind
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

const PALETTE_CLASSIFIER_KIND: Record<string, UmlClassifierKind> = {
  'dg-uml-class': 'class',
  'dg-uml-interface': 'interface',
  'dg-uml-package': 'package',
  'dg-uml-component': 'component'
}

export function createDefaultUmlClassifierData(
  paletteItem?: DiagramShapeItem,
  overrides?: Partial<UmlClassifierData>
): UmlClassifierData {
  const paletteKind = paletteItem ? PALETTE_CLASSIFIER_KIND[paletteItem.id] : undefined
  return {
    classifierKind: paletteKind ?? 'class',
    name: paletteItem?.defaultText?.split('\n')[0]?.replace(/^«interface»\s*/, '') ?? 'ClassName',
    attributes: [],
    operations: [],
    showAttributes: true,
    showOperations: true,
    ...overrides
  }
}

export const umlClassifierCodec: IDiagramShapePayloadCodec<UmlClassifierData> = {
  kind: UML_CLASSIFIER_KIND,
  syncLfText: false,
  layoutHandledByModel: true,

  createDefault(paletteItem, overrides) {
    return createDefaultUmlClassifierData(paletteItem, overrides)
  },

  read(envelope) {
    return normalizeUmlClassifierData(envelope.data)
  },

  toEnvelope(data) {
    return {
      schemaVersion: 1,
      kind: UML_CLASSIFIER_KIND,
      data: normalizeUmlClassifierData(data)
    }
  },

  serializeText(data) {
    const lines: string[] = []
    const stereotype = classifierStereotype(data.classifierKind)
    if (stereotype) lines.push(stereotype)
    lines.push(data.name || 'ClassName')
    if (data.showAttributes) {
      lines.push('—')
      for (const attr of data.attributes) {
        const staticMark = attr.isStatic ? '{static} ' : ''
        lines.push(`${staticMark}${formatUmlAttributeLine(attr)}`)
      }
    }
    if (data.showOperations) {
      if (!data.showAttributes) lines.push('—')
      for (const op of data.operations) {
        const staticMark = op.isStatic ? '{static} ' : ''
        const abstractMark = op.isAbstract ? '{abstract} ' : ''
        lines.push(`${staticMark}${abstractMark}${formatUmlOperationLine(op)}`)
      }
    }
    return lines.join('\n')
  },

  computeLayout(data, width) {
    return computeUmlClassifierLayout(data, width)
  },

  syncLayoutToModel(model, _data) {
    syncUmlClassifierLayoutToNode(
      model as Parameters<typeof syncUmlClassifierLayoutToNode>[0]
    )
  },

  migrateLegacyNode(node: LogicFlow.NodeConfig) {
    if (String(node.type) !== 'dg-uml-class' && String(node.type) !== 'dg-uml-interface') {
      return null
    }
    const text = typeof node.text === 'string' ? node.text : String((node.text as { value?: string })?.value ?? '')
    if (!text.trim()) return null

    const data = createDefaultUmlClassifierData()
    if (String(node.type) === 'dg-uml-interface') {
      data.classifierKind = 'interface'
    }
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
    let i = 0

    if (lines[0]?.startsWith('«interface»')) {
      data.classifierKind = 'interface'
      i++
    } else if (lines[0]?.startsWith('«abstract»')) {
      data.classifierKind = 'abstractClass'
      i++
    } else if (lines[0]?.startsWith('«enumeration»')) {
      data.classifierKind = 'enum'
      i++
    } else if (lines[0]?.startsWith('«component»')) {
      data.classifierKind = 'component'
      i++
    } else if (lines[0]?.startsWith('«package»')) {
      data.classifierKind = 'package'
      i++
    }
    if (lines[i] && lines[i] !== '—') {
      data.name = lines[i].replace(/^«interface»\s*/, '')
      i++
    }
    if (lines[i] === '—') i++

    while (i < lines.length) {
      const line = lines[i]
      if (line === '—') {
        i++
        continue
      }
      const parsed = parseLegacyMemberLine(line)
      if (parsed.kind === 'operation') {
        data.operations.push({
          id: createMemberId(),
          name: parsed.name,
          visibility: parsed.visibility,
          isStatic: parsed.isStatic,
          isAbstract: parsed.isAbstract,
          parameters: parsed.parameters,
          returnType: parsed.returnType
        })
      } else {
        data.attributes.push({
          id: createMemberId(),
          name: parsed.name,
          visibility: parsed.visibility,
          isStatic: parsed.isStatic,
          type: parsed.type
        })
      }
      i++
    }

    return umlClassifierCodec.toEnvelope(data)
  }
}

function parseLegacyMemberLine(line: string): {
  kind: 'attribute' | 'operation'
  name: string
  visibility: UmlClassifierData['attributes'][0]['visibility']
  isStatic: boolean
  isAbstract: boolean
  type?: string
  returnType?: string
  parameters: Array<{ name: string; type?: string }>
} {
  let rest = line
  let isStatic = false
  let isAbstract = false

  if (rest.startsWith('{static}')) {
    isStatic = true
    rest = rest.slice('{static}'.length).trim()
  }
  if (rest.startsWith('{abstract}')) {
    isAbstract = true
    rest = rest.slice('{abstract}'.length).trim()
  }

  const visMatch = rest.match(/^([+#!~-])/)
  const visibility = visCharToVisibility(visMatch?.[1] ?? '+')
  rest = visMatch ? rest.slice(1).trim() : rest

  const isOperation = rest.includes('(')
  if (isOperation) {
    const m = rest.match(/^([^(]+)\(([^)]*)\)(?:\s*:\s*(.+))?$/)
    const name = m?.[1]?.trim() ?? rest
    const paramsRaw = m?.[2] ?? ''
    const returnType = m?.[3]?.trim()
    const parameters = paramsRaw
      ? paramsRaw.split(',').map((p) => ({ name: p.trim() }))
      : []
    return { kind: 'operation', name, visibility, isStatic, isAbstract, parameters, returnType }
  }

  const m = rest.match(/^([^:]+)(?::\s*(.+))?$/)
  return {
    kind: 'attribute',
    name: m?.[1]?.trim() ?? rest,
    visibility,
    isStatic,
    isAbstract: false,
    type: m?.[2]?.trim(),
    parameters: []
  }
}

function visCharToVisibility(c: string): UmlClassifierData['attributes'][0]['visibility'] {
  switch (c) {
    case '#':
      return 'protected'
    case '-':
      return 'private'
    case '~':
      return 'package'
    default:
      return 'public'
  }
}

export type UmlClassifierEnvelope = DiagramShapePayloadEnvelope<UmlClassifierData>
