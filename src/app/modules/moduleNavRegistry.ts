import type { WwIconName } from '@shared/icons/registry'
import type { ModuleId } from '@shared/constants/modules'
import { isKnownModuleId } from '@shared/constants/modules'

export interface IModuleNavContributor {
  readonly moduleId: ModuleId
  readonly label: string
  readonly icon: WwIconName
  readonly path: string
  readonly order?: number
  isEnabled?(): boolean
}

const contributors: IModuleNavContributor[] = []

export function registerModuleNav(contributor: IModuleNavContributor): void {
  contributors.push(contributor)
}

export function collectModuleNavItems(): IModuleNavContributor[] {
  return [...contributors]
    .filter((item) => item.isEnabled?.() ?? true)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getModuleNavItem(moduleId: ModuleId): IModuleNavContributor | undefined {
  return collectModuleNavItems().find((item) => item.moduleId === moduleId)
}

export function isModuleNavEnabled(moduleId: ModuleId): boolean {
  const item = contributors.find((entry) => entry.moduleId === moduleId)
  if (!item) return false
  return item.isEnabled?.() ?? true
}

export function modulePathById(moduleId: ModuleId): string {
  return getModuleNavItem(moduleId)?.path ?? '/library'
}

/** 渲染进程：模块是否已在导航注册表中 */
export function isModuleIdRegistered(value: string): value is ModuleId {
  if (!value || typeof value !== 'string') return false
  return collectModuleNavItems().some((item) => item.moduleId === value)
}

/** 渲染进程：校验模块 ID（注册表优先，兜底已知列表） */
export function isModuleId(value: string): value is ModuleId {
  if (!value || typeof value !== 'string') return false
  if (isModuleIdRegistered(value)) return true
  return isKnownModuleId(value)
}

export function resolveDefaultModuleId(): ModuleId {
  const first = collectModuleNavItems()[0]
  return first?.moduleId ?? 'library'
}
