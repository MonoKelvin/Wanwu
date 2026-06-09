import type {
  UmlClassifierData,
  UmlClassifierKind,
  UmlVisibility
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierTypes'

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

export type UmlClassifierLfType = 'dg-uml-class' | 'dg-uml-interface'

export function lfTypeForClassifierKind(kind: UmlClassifierKind): UmlClassifierLfType {
  return kind === 'interface' ? 'dg-uml-interface' : 'dg-uml-class'
}

/** 切换 classifierKind 时应用的显示区预设（与 palette defaultOverrides 对齐） */
export function classifierKindChangePatch(kind: UmlClassifierKind): Partial<UmlClassifierData> {
  switch (kind) {
    case 'interface':
      return { classifierKind: kind }
    case 'component':
      return { classifierKind: kind, showAttributes: false, showOperations: true }
    case 'enum':
    case 'package':
      return { classifierKind: kind, showAttributes: true, showOperations: false }
    default:
      return { classifierKind: kind }
  }
}

export const UML_CLASSIFIER_KIND_OPTIONS = [
  { label: '类', value: 'class' },
  { label: '接口', value: 'interface' },
  { label: '抽象类', value: 'abstractClass' },
  { label: '枚举', value: 'enum' },
  { label: '组件', value: 'component' },
  { label: '包', value: 'package' }
] as const
