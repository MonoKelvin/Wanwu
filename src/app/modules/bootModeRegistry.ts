import type { Component } from 'vue'
import type { BootMode } from '@app/bootstrap/bootMode'
import type { IBootModeContributor } from '@app/modules/types'

const builtinModes = new Set<BootMode>(['main', 'tray-menu', 'daily-widget'])

const contributors: IBootModeContributor[] = []

export function registerBootModeContributor(contributor: IBootModeContributor): void {
  contributors.push(contributor)
}

export function getBootModeContributor(mode: BootMode): IBootModeContributor | undefined {
  return contributors.find((item) => item.mode === mode)
}

export function detectRegisteredBootMode(): BootMode | null {
  for (const contributor of contributors) {
    if (contributor.detect()) return contributor.mode
  }
  return null
}

export async function loadBootRootComponent(mode: BootMode): Promise<Component | null> {
  const contributor = getBootModeContributor(mode)
  if (!contributor) return null
  return contributor.loadRootComponent()
}

export function isRegisteredBootMode(mode: BootMode): boolean {
  return builtinModes.has(mode) || contributors.some((item) => item.mode === mode)
}
