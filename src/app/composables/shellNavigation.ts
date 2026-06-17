import { nextTick } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'
import {
  resumeNavigationContributors,
  teardownNavigationContributors
} from '@app/modules/navigationRegistry'

export function releaseFocusBeforeNavigation() {
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur()
  }
  const pm = document.querySelector('.ProseMirror-focused')
  if (pm instanceof HTMLElement) pm.blur()
}

async function waitForEditorDomRelease() {
  await nextTick()
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}

/** 导航前：blur → 各模块注册的拆卸逻辑 → 等 DOM 释放后再 push */
export async function prepareShellNavigation() {
  releaseFocusBeforeNavigation()
  teardownNavigationContributors()
  await waitForEditorDomRelease()
}

export async function pushShellRoute(router: Router, to: RouteLocationRaw) {
  const resolved = router.resolve(to)
  if (router.currentRoute.value.fullPath === resolved.fullPath) return

  await prepareShellNavigation()
  await router.push(to).catch((err) => {
    if (import.meta.env.DEV) {
      console.warn('[pushShellRoute] navigation failed:', err)
    }
  })
}

export function setupShellNavigationHooks(router: Router) {
  router.afterEach((to) => {
    resumeNavigationContributors(to)
  })
}
