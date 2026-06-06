import { getMainWindow } from '../windowState'
import { normalizeAppSettings } from '../services/data/settings'
import { applyLaunchAtStartup } from '../services/app/launchAtStartup'
import { startBrowserBookmarksWatchers } from '../services/links/bookmarksWatcher'
import { initQuickAccess } from '../services/quickAccess/quickAccessManager'
import { configureAppQuit } from '../services/app/appQuit'
import { configureWindowClosePolicy } from '../services/app/windowClose'
import { registerLibraryHandlers } from './domains/libraryHandlers'
import { registerDiagramsHandlers } from './domains/diagramsHandlers'
import { registerLinksHandlers } from './domains/linksHandlers'
import { registerRssHandlers } from './domains/rssHandlers'
import { registerMusicHandlers } from './domains/musicHandlers'
import { registerNotesHandlers } from './domains/notesHandlers'
import { registerUserHandlers } from './domains/userHandlers'
import { registerAppHandlers } from './domains/appHandlers'
import { registerWindowHandlers } from './domains/windowHandlers'
import { registerShellHandlers } from './domains/shellHandlers'
import { registerShareHandlers } from './domains/shareHandlers'
import { registerCloudAbodeHandlers } from './domains/cloudAbodeHandlers'
import { registerQuickAccessHandlers } from './domains/quickAccessHandlers'
import type { AppServices } from './types'

export type { AppServices } from './types'

export function registerIpcHandlers(services: AppServices): void {
  registerLibraryHandlers(services)
  registerDiagramsHandlers(services)
  registerLinksHandlers(services)
  registerRssHandlers(services)
  registerMusicHandlers(services)
  registerNotesHandlers(services)
  registerUserHandlers(services)
  registerAppHandlers(services)
  registerWindowHandlers(services)
  registerShellHandlers(services)
  registerShareHandlers(services)
  registerCloudAbodeHandlers(services)
  registerQuickAccessHandlers(services)

  startBrowserBookmarksWatchers(() => getMainWindow())
  initQuickAccess(services)
  configureAppQuit(services)
  configureWindowClosePolicy(services)
  applyLaunchAtStartup(
    normalizeAppSettings(services.userData?.getAppSettings() ?? {}).launchAtStartup
  )
}
