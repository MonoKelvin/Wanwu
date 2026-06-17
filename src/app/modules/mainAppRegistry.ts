import type { MainAppStartupContext } from '@app/modules/types'

const integrations: Array<() => void> = []
const startupHooks: Array<(ctx: MainAppStartupContext) => void> = []

export function registerMainAppIntegration(setup: () => void): void {
  integrations.push(setup)
}

export function registerMainAppStartup(hook: (ctx: MainAppStartupContext) => void): void {
  startupHooks.push(hook)
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
