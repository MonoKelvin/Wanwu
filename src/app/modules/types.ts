import type { App, Component } from 'vue'
import type { RouteLocationNormalized, RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { ICommandContributor } from '@app/command'
import type { BootMode } from '@app/bootstrap/bootMode'
import type { AppSettings } from '@shared/types/settings'
import type { ModuleId } from '@shared/constants/modules'
import type { LibrarySubmoduleConfig } from '@app/modules/librarySubmoduleTypes'
import type { IQuickAccessTargetHandler } from '@app/modules/quickAccessRegistry'
import type { IPathMemoryContributor } from '@app/modules/pathMemoryRegistry'
import type { ISettingsSectionContributor } from '@app/modules/settingsSectionRegistry'
import type { IShellChromeContributor } from '@app/modules/shellChromeRegistry'
import type { IShellThemeContributor } from '@app/modules/shellThemeRegistry'
import type { ISubPanelContributor } from '@app/modules/subPanelRegistry'
import type { IModuleNavContributor } from '@app/modules/moduleNavRegistry'

export interface ModuleNavDescriptor {
  readonly moduleId: ModuleId
  readonly label: string
  readonly icon: import('@shared/icons/registry').WwIconName
  readonly path: string
  readonly order?: number
}

export interface INavigationContributor {
  readonly id: string
  teardownBeforeNavigation(): void | Promise<void>
  shouldResumeAfterNavigation?(to: RouteLocationNormalized): boolean
  resumeAfterNavigation?(to: RouteLocationNormalized): void
}

export interface IShellOutletContributor {
  readonly id: string
  /** 数值越大越优先匹配 */
  readonly priority?: number
  matchesRoute(route: RouteLocationNormalized): boolean
  loadComponent(): Promise<Component>
  keepAliveInclude?: string
  getActiveShellKey?(route: RouteLocationNormalized): string
}

export interface IBootModeContributor {
  readonly mode: BootMode
  detect(): boolean
  loadRootComponent(): Promise<Component>
  loadStyles?: () => Promise<void>
  needsToastStack?: boolean
  installUiPlugins?: (app: App) => Promise<void>
}

export interface MainAppStartupContext {
  runWhenIdle(fn: () => void): void
  settings: AppSettings
}

export interface IAppModule {
  readonly id: string
  /** 主模块导航 ID（用于 Shell 视图、侧栏等） */
  readonly moduleId?: ModuleId
  /** 文库默认首页路由名（可选，由模块声明） */
  readonly libraryHomeRouteName?: string
  readonly commandContributor?: ICommandContributor
  /** 主模块侧栏导航（可选） */
  getModuleNav?(): ModuleNavDescriptor | null
  /** 模块是否对用户可见（默认 true） */
  isModuleEnabled?(): boolean
  getRoutes?(): RouteRecordRaw[]
  getLibraryChildRoutes?(): RouteRecordRaw[]
  getLibrarySubmodule?(): LibrarySubmoduleConfig
  loadShellView?(): Promise<Component>
  loadItemDetailView?(): Promise<Component>
  resolveLegacyLibraryPath?(cat: string, sub?: string): RouteLocationRaw | null
  resolveFallbackLegacyLibraryPath?(cat: string, sub?: string): RouteLocationRaw | null
  /** 顶层路径是否归属文库模块（如 /notes） */
  belongsToLibraryPath?(path: string): boolean
  registerNavigation?(register: (contributor: INavigationContributor) => void): void
  registerShellOutlet?(register: (contributor: IShellOutletContributor) => void): void
  registerBootMode?(register: (contributor: IBootModeContributor) => void): void
  registerMainAppIntegration?(register: (setup: () => void) => void): void
  registerMainAppStartup?(register: (hook: (ctx: MainAppStartupContext) => void) => void): void
  registerQuickAccess?(register: (handler: IQuickAccessTargetHandler) => void): void
  registerSettingsSection?(register: (contributor: ISettingsSectionContributor) => void): void
  registerSubPanel?(register: (contributor: ISubPanelContributor) => void): void
  registerShellChrome?(register: (contributor: IShellChromeContributor) => void): void
  registerShellTheme?(register: (contributor: IShellThemeContributor) => void): void
  registerPathMemory?(register: (contributor: IPathMemoryContributor) => void): void
}
