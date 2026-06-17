export type {
  IAppModule,
  IBootModeContributor,
  INavigationContributor,
  IShellOutletContributor,
  MainAppStartupContext,
  ModuleNavDescriptor
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
  isRegisteredBootMode,
  getBootModeContributor
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
  collectLibrarySubmodules,
  resolveModuleLegacyLibraryPath,
  resolveFallbackLegacyLibraryPath,
  collectCommandContributors,
  getLibraryHomeRouteName,
  belongsToLibraryModulePath,
  loadShellView,
  loadItemDetailView
} from '@app/modules/moduleRegistry'

export {
  registerModuleNav,
  collectModuleNavItems,
  getModuleNavItem,
  isModuleNavEnabled,
  modulePathById
} from '@app/modules/moduleNavRegistry'

export {
  registerQuickAccessTargetHandler,
  getQuickAccessTargetHandler,
  getQuickAccessTargetHandlers,
  dispatchQuickAccessTarget
} from '@app/modules/quickAccessRegistry'

export {
  registerQuickAccessKind,
  getQuickAccessKindMeta,
  collectQuickAccessKindOrder
} from '@app/modules/quickAccessKindRegistry'

export {
  registerSettingsSection,
  collectSettingsSections,
  getSettingsSection
} from '@app/modules/settingsSectionRegistry'

export {
  registerSubPanelContributor,
  resolveSubPanel,
  moduleHasSubPanel
} from '@app/modules/subPanelRegistry'

export {
  registerShellChromeContributor,
  collectVisibleShellChrome
} from '@app/modules/shellChromeRegistry'

export {
  registerShellThemeContributor,
  resolveShellMainClass
} from '@app/modules/shellThemeRegistry'

export {
  registerPathMemoryContributor,
  collectPathMemoryContributors
} from '@app/modules/pathMemoryRegistry'

export type {
  LibrarySubmoduleConfig,
  LibrarySubmoduleContext
} from '@app/modules/librarySubmoduleTypes'
