import type { UmlVisibility } from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

export interface UmlVisibilityOption {
  value: UmlVisibility
  symbol: string
  label: string
  description: string
}

export const UML_VISIBILITY_OPTIONS: readonly UmlVisibilityOption[] = [
  { value: 'public', symbol: '+', label: 'public', description: '公有' },
  { value: 'protected', symbol: '#', label: 'protected', description: '保护' },
  { value: 'private', symbol: '-', label: 'private', description: '私有' },
  { value: 'package', symbol: '~', label: 'package', description: '包内' }
] as const

export function visibilityOptionLabel(visibility: UmlVisibility): string {
  const item = UML_VISIBILITY_OPTIONS.find((o) => o.value === visibility)
  return item ? `${item.symbol} ${item.label}` : '+ public'
}

export const UML_CLASSIFIER_KIND_OPTIONS = [
  { label: '类', value: 'class' },
  { label: '接口', value: 'interface' },
  { label: '抽象类', value: 'abstractClass' },
  { label: '枚举', value: 'enum' }
] as const
