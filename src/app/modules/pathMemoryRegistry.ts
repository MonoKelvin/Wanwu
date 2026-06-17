import type { RouteLocationNormalized, RouteLocationRaw } from 'vue-router'

export interface IPathMemoryContributor {
  readonly id: string
  beforeEach?(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): RouteLocationRaw | boolean | void
}

const contributors: IPathMemoryContributor[] = []

export function registerPathMemoryContributor(contributor: IPathMemoryContributor): void {
  contributors.push(contributor)
}

export function collectPathMemoryContributors(): readonly IPathMemoryContributor[] {
  return contributors
}
