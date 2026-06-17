import type { Component } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { ModuleId } from '@shared/constants/modules'

export interface ShellChromeContext {
  route: RouteLocationNormalized
  routeModule: ModuleId | undefined
  isFullscreen: boolean
}

export interface IShellChromeContributor {
  readonly id: string
  readonly transitionName?: string
  shouldShow(ctx: ShellChromeContext): boolean
  loadComponent(): Promise<Component>
}

const contributors: IShellChromeContributor[] = []

export function registerShellChromeContributor(contributor: IShellChromeContributor): void {
  contributors.push(contributor)
}

export function collectVisibleShellChrome(ctx: ShellChromeContext): IShellChromeContributor[] {
  return contributors.filter((item) => item.shouldShow(ctx))
}
