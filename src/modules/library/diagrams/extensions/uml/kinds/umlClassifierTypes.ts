export type UmlVisibility = 'public' | 'protected' | 'private' | 'package'

export type UmlClassifierKind = 'class' | 'interface' | 'abstractClass' | 'enum'

export interface UmlClassifierMemberBase {
  id: string
  name: string
  visibility: UmlVisibility
  isStatic: boolean
  stereotype?: string
}

export interface UmlAttribute extends UmlClassifierMemberBase {
  type?: string
  defaultValue?: string
}

export interface UmlOperation extends UmlClassifierMemberBase {
  isAbstract: boolean
  parameters: Array<{ name: string; type?: string }>
  returnType?: string
}

export interface UmlClassifierData {
  classifierKind: UmlClassifierKind
  name: string
  attributes: UmlAttribute[]
  operations: UmlOperation[]
  showAttributes: boolean
  showOperations: boolean
}

export const UML_CLASSIFIER_KIND = 'uml.classifier' as const

export function createMemberId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
