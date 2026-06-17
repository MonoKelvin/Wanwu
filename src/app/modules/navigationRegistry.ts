import type { RouteLocationNormalized } from 'vue-router'
import type { INavigationContributor } from '@app/modules/types'

const contributors: INavigationContributor[] = []

export function registerNavigationContributor(contributor: INavigationContributor): void {
  contributors.push(contributor)
}

export function teardownNavigationContributors(): void {
  for (const contributor of contributors) {
    contributor.teardownBeforeNavigation()
  }
}

export function resumeNavigationContributors(to: RouteLocationNormalized): void {
  for (const contributor of contributors) {
    if (!contributor.shouldResumeAfterNavigation?.(to)) continue
    contributor.resumeAfterNavigation?.(to)
  }
}
