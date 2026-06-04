import { syncNotesDraftBeforeNavigation } from '@modules/library/notes/lib/notesNavigationTeardown'

export function releaseFocusBeforeNavigation() {
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body) {
    active.blur()
  }
}

/** 导航前：blur + 同步草稿（不卸载 Tiptap；卸载交给路由切换后的组件 unmount） */
export function prepareShellNavigation() {
  releaseFocusBeforeNavigation()
  syncNotesDraftBeforeNavigation()
}
