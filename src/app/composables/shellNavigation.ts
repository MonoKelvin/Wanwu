import { nextTick } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'
import { LIBRARY_NOTES_ROUTE } from '@modules/library/notes/domain/noteRoutes'
import { resumeNotesEditorMount } from '@modules/library/notes/lib/notesEditorMount'
import { teardownNotesEditorBeforeNavigation } from '@modules/library/notes/lib/notesNavigationTeardown'

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

/** 导航前：blur → 卸 Tiptap → 等 DOM 释放后再 push */
export async function prepareShellNavigation() {
  releaseFocusBeforeNavigation()
  teardownNotesEditorBeforeNavigation()
  await waitForEditorDomRelease()
}

export async function pushShellRoute(router: Router, to: RouteLocationRaw) {
  const resolved = router.resolve(to)
  if (router.currentRoute.value.fullPath === resolved.fullPath) return

  await prepareShellNavigation()
  await router.push(to).catch(() => {})
}

export function setupShellNavigationHooks(router: Router) {
  router.afterEach((to) => {
    if (to.name === LIBRARY_NOTES_ROUTE) {
      resumeNotesEditorMount()
    }
  })
}
