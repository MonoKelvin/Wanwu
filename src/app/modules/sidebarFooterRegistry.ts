import type { Component } from 'vue'
import type { AppSettings, NavDisplay } from '@shared/types/settings'

export interface SidebarFooterContext {
  isFullscreen: boolean
  navDisplay: NavDisplay
  /** 侧栏渲染时的应用设置快照，供贡献项判断是否启用 */
  settings: AppSettings
}

export interface ISidebarFooterContributor {
  readonly id: string
  readonly order?: number
  isEnabled(ctx: SidebarFooterContext): boolean
  loadComponent(): Promise<Component>
}

const contributors: ISidebarFooterContributor[] = []

export function registerSidebarFooterContributor(contributor: ISidebarFooterContributor): void {
  contributors.push(contributor)
}

export function collectSidebarFooterContributors(
  ctx: SidebarFooterContext
): ISidebarFooterContributor[] {
  return contributors
    .filter((item) => item.isEnabled(ctx))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}
