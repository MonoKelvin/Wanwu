import type { Component } from 'vue'
import type { RouteLocationNormalized, RouteLocationRaw, RouteRecordRaw } from 'vue-router'
import type { ICommandContributor } from '@app/command'
import type { BootMode } from '@app/bootstrap/bootMode'
import type { AppSettings } from '@shared/types/settings'

export interface INavigationContributor {
  readonly id: string
  teardownBeforeNavigation(): void
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
}

export interface IBootModeContributor {
  readonly mode: BootMode
  detect(): boolean
  loadRootComponent(): Promise<Component>
}

export interface MainAppStartupContext {
  runWhenIdle(fn: () => void): void
  settings: AppSettings
}

export interface IAppModule {
  readonly id: string
  /** 文库默认首页路由名（可选，由模块声明） */
  readonly libraryHomeRouteName?: string
  readonly commandContributor?: ICommandContributor
  getRoutes?(): RouteRecordRaw[]
  getLibraryChildRoutes?(): RouteRecordRaw[]
  resolveLegacyLibraryPath?(cat: string, sub?: string): RouteLocationRaw | null
  registerNavigation?(register: (contributor: INavigationContributor) => void): void
  registerShellOutlet?(register: (contributor: IShellOutletContributor) => void): void
  registerBootMode?(register: (contributor: IBootModeContributor) => void): void
  registerMainAppIntegration?(register: (setup: () => void) => void): void
  registerMainAppStartup?(register: (hook: (ctx: MainAppStartupContext) => void) => void): void
}
