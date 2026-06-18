import { normalizeAppSettings } from '../services/data/settings'
import { applyLaunchAtStartup } from '../services/app/launchAtStartup'
import { configureAppQuit } from '../services/app/appQuit'
import { configureWindowClosePolicy } from '../services/app/windowClose'
import { registerAppHandlers } from './domains/appHandlers'
import { registerWindowHandlers } from './domains/windowHandlers'
import { registerShellHandlers } from './domains/shellHandlers'
import { registerShareHandlers } from './domains/shareHandlers'
import { registerMainProcessModuleIpc } from '../app/mainProcessContext'
import type { AppServices } from './types'

export type { AppServices } from './types'

export function registerIpcHandlers(services: AppServices): void {
  registerAppHandlers(services)
  registerWindowHandlers(services)
  registerShellHandlers(services)
  registerShareHandlers(services)
  registerMainProcessModuleIpc(services)

  configureAppQuit(services)
  configureWindowClosePolicy(services)
  applyLaunchAtStartup(
    normalizeAppSettings(services.userData?.getAppSettings() ?? {}).launchAtStartup
  )
}
