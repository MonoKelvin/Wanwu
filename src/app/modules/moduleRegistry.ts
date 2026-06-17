import type { RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { ICommandContributor } from '@app/command'
import { registerBootModeContributor } from '@app/modules/bootModeRegistry'
import { registerMainAppIntegration, registerMainAppStartup } from '@app/modules/mainAppRegistry'
import { registerNavigationContributor } from '@app/modules/navigationRegistry'
import { registerShellOutletContributor } from '@app/modules/shellOutletRegistry'
import type { IAppModule } from '@app/modules/types'
import { notesAppModule } from '@modules/library/notes/app/notesModule'

const appModules: IAppModule[] = [notesAppModule]

let bootstrapped = false

function ensureBootstrapped(): void {
  if (bootstrapped) return
  bootstrapped = true

  for (const module of appModules) {
    module.registerNavigation?.(registerNavigationContributor)
    module.registerShellOutlet?.(registerShellOutletContributor)
    module.registerBootMode?.(registerBootModeContributor)
    module.registerMainAppIntegration?.(registerMainAppIntegration)
    module.registerMainAppStartup?.(registerMainAppStartup)
  }
}

export function getAppModules(): readonly IAppModule[] {
  ensureBootstrapped()
  return appModules
}

export function collectModuleRoutes(): RouteRecordRaw[] {
  ensureBootstrapped()
  return appModules.flatMap((module) => module.getRoutes?.() ?? [])
}

export function collectLibraryChildRoutes(): RouteRecordRaw[] {
  ensureBootstrapped()
  return appModules.flatMap((module) => module.getLibraryChildRoutes?.() ?? [])
}

export function resolveModuleLegacyLibraryPath(
  cat: string,
  sub?: string
): RouteLocationRaw | null {
  ensureBootstrapped()
  for (const module of appModules) {
    const resolved = module.resolveLegacyLibraryPath?.(cat, sub)
    if (resolved) return resolved
  }
  return null
}

export function getLibraryHomeRouteName(): string | undefined {
  ensureBootstrapped()
  return appModules.find((module) => module.libraryHomeRouteName)?.libraryHomeRouteName
}

export function collectCommandContributors(): ICommandContributor[] {
  ensureBootstrapped()
  return appModules
    .map((module) => module.commandContributor)
    .filter((contributor): contributor is ICommandContributor => Boolean(contributor))
}
