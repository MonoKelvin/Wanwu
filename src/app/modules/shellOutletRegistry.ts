import type { Component } from 'vue'
import type { RouteLocationNormalized } from 'vue-router'
import type { IShellOutletContributor } from '@app/modules/types'

const outlets: IShellOutletContributor[] = []

export function registerShellOutletContributor(contributor: IShellOutletContributor): void {
  outlets.push(contributor)
}

export function resolveShellOutlet(
  route: RouteLocationNormalized
): IShellOutletContributor | null {
  const sorted = [...outlets].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  )
  return sorted.find((outlet) => outlet.matchesRoute(route)) ?? null
}

export async function loadShellOutletComponent(
  outlet: IShellOutletContributor
): Promise<Component> {
  return outlet.loadComponent()
}
