/** 便笺页在 router.push 前同步 Tiptap → 草稿（不卸载编辑器，避免中断导航） */
let syncHook: (() => void) | null = null

export function registerNotesNavigationSync(hook: () => void): () => void {
  syncHook = hook
  return () => {
    if (syncHook === hook) syncHook = null
  }
}

export function syncNotesDraftBeforeNavigation() {
  syncHook?.()
}
