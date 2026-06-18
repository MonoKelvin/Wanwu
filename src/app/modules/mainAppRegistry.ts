import type { Component } from 'vue'
import type { MainAppStartupContext } from '@app/modules/types'

const integrations: Array<() => void> = []
const startupHooks: Array<(ctx: MainAppStartupContext) => void> = []
const shellOverlayLoaders: Array<() => Promise<Component>> = []

export function registerMainAppIntegration(setup: () => void): void {
  integrations.push(setup)
}

export function registerMainAppStartup(hook: (ctx: MainAppStartupContext) => void): void {
  startupHooks.push(hook)
}

/** 主窗口 Shell 叠加层（命令面板等），由 quick-access 等模块注册 */
export function registerAppShellOverlay(loader: () => Promise<Component>): void {
  shellOverlayLoaders.push(loader)
}

export function getAppShellOverlayLoaders(): readonly (() => Promise<Component>)[] {
  return shellOverlayLoaders
}

export function useMainAppIntegrations(): void {
  for (const setup of integrations) {
    setup()
  }
}

export function runMainAppStartupHooks(ctx: MainAppStartupContext): void {
  for (const hook of startupHooks) {
    hook(ctx)
  }
}
