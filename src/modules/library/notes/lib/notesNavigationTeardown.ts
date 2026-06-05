import { suspendNotesEditorForNavigation } from '@modules/library/notes/lib/notesEditorMount'

/** 便笺页在 router.push 前同步 Tiptap → 草稿（不卸载编辑器，避免中断导航） */
let syncHook: (() => void) | null = null
let destroyHook: (() => void) | null = null

export function registerNotesNavigationSync(hook: () => void): () => void {
  syncHook = hook
  return () => {
    if (syncHook === hook) syncHook = null
  }
}

export function registerNotesEditorDestroy(hook: () => void): () => void {
  destroyHook = hook
  return () => {
    if (destroyHook === hook) destroyHook = null
  }
}

export function syncNotesDraftBeforeNavigation() {
  syncHook?.()
}

/** 导航前：同步草稿 → 销毁 Tiptap → 暂停编辑器挂载 */
export function teardownNotesEditorBeforeNavigation() {
  syncNotesDraftBeforeNavigation()
  destroyHook?.()
  suspendNotesEditorForNavigation()
}
