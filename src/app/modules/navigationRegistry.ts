import type { RouteLocationNormalized } from 'vue-router'
import type { INavigationContributor } from '@app/modules/types'

const contributors: INavigationContributor[] = []

export function registerNavigationContributor(contributor: INavigationContributor): void {
  contributors.push(contributor)
}

export async function teardownNavigationContributors(): Promise<void> {
  await Promise.all(
    contributors.map((contributor) => Promise.resolve(contributor.teardownBeforeNavigation()))
  )
}

export function resumeNavigationContributors(to: RouteLocationNormalized): void {
  for (const contributor of contributors) {
    if (!contributor.shouldResumeAfterNavigation?.(to)) continue
    contributor.resumeAfterNavigation?.(to)
  }
}
