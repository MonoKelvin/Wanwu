export type {
  IAppModule,
  IBootModeContributor,
  INavigationContributor,
  IShellOutletContributor,
  MainAppStartupContext
} from '@app/modules/types'

export {
  registerNavigationContributor,
  teardownNavigationContributors,
  resumeNavigationContributors
} from '@app/modules/navigationRegistry'

export {
  registerShellOutletContributor,
  resolveShellOutlet,
  loadShellOutletComponent
} from '@app/modules/shellOutletRegistry'

export {
  registerBootModeContributor,
  detectRegisteredBootMode,
  loadBootRootComponent,
  isRegisteredBootMode
} from '@app/modules/bootModeRegistry'

export {
  registerMainAppIntegration,
  registerMainAppStartup,
  useMainAppIntegrations,
  runMainAppStartupHooks
} from '@app/modules/mainAppRegistry'

export {
  getAppModules,
  collectModuleRoutes,
  collectLibraryChildRoutes,
  resolveModuleLegacyLibraryPath,
  collectCommandContributors,
  getLibraryHomeRouteName
} from '@app/modules/moduleRegistry'
