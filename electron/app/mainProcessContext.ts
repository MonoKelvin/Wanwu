import type { AppServices } from '../ipc/types'
import type { MainProcessInitContext } from '../../src/shared/module-bridge/mainProcessRegistry'
import { getMainProcessModules } from '../../src/shared/module-bridge/mainProcessRegistry'

export function createMainProcessContext(services: AppServices): MainProcessInitContext {
  return {
    services: {
      db: services.db,
      userData: services.userData,
      media: services.media,
      moduleRuntime: services.moduleRuntime
    }
  }
}

export async function initMainProcessModules(services: AppServices): Promise<void> {
  const ctx = createMainProcessContext(services)
  for (const mod of getMainProcessModules()) {
    await mod.initServices?.(ctx)
  }
  for (const mod of getMainProcessModules()) {
    await mod.onModulesReady?.(ctx)
  }
}

export function registerMainProcessModuleIpc(services: AppServices): void {
  const ctx = createMainProcessContext(services)
  for (const mod of getMainProcessModules()) {
    mod.registerIpcHandlers?.(ctx)
  }
}
