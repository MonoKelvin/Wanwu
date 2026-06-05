import { ref } from 'vue'

/** 跨模块导航前暂停挂载 Tiptap，避免与 RouterView 切换在同一 tick 冲突 */
export const notesEditorMountAllowed = ref(true)

export function suspendNotesEditorForNavigation() {
  notesEditorMountAllowed.value = false
}

export function resumeNotesEditorMount() {
  notesEditorMountAllowed.value = true
}
