import type { ModuleId } from '@shared/constants/modules'

export interface IShellThemeContributor {
  readonly moduleId: ModuleId
  readonly mainClass: string
}

const contributors: IShellThemeContributor[] = []

export function registerShellThemeContributor(contributor: IShellThemeContributor): void {
  contributors.push(contributor)
}

export function resolveShellMainClass(moduleId: ModuleId | undefined): string {
  if (!moduleId) return 'bg-ww-content'
  return contributors.find((item) => item.moduleId === moduleId)?.mainClass ?? 'bg-ww-content'
}
