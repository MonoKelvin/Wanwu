import { onBeforeUnmount, onMounted } from 'vue'

const CONTENT_SELECTOR = '.ww-notes-editor__content'

export function readNoteEditorScrollTop(): number {
  const el = document.querySelector(CONTENT_SELECTOR)
  return el instanceof HTMLElement ? el.scrollTop : 0
}

export function applyNoteEditorScrollTop(scrollTop: number) {
  const el = document.querySelector(CONTENT_SELECTOR)
  if (el instanceof HTMLElement) {
    el.scrollTop = Math.max(0, scrollTop)
  }
}

export function useNotePopoutScrollPersistence(noteId: () => string | null) {
  let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null
  let scrollEl: HTMLElement | null = null

  function scheduleSaveScroll() {
    const id = noteId()
    if (!id) return
    if (scrollSaveTimer) clearTimeout(scrollSaveTimer)
    scrollSaveTimer = setTimeout(() => {
      scrollSaveTimer = null
      void window.wanwu.notes.popout.saveScroll({
        noteId: id,
        scrollTop: readNoteEditorScrollTop()
      })
    }, 240)
  }

  function onScroll() {
    scheduleSaveScroll()
  }

  const stopRestoreListener = window.wanwu.notes.popout.onRestoreScroll(({ scrollTop }) => {
    requestAnimationFrame(() => applyNoteEditorScrollTop(scrollTop))
  })

  onMounted(() => {
    scrollEl = document.querySelector(CONTENT_SELECTOR)
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    if (scrollSaveTimer) clearTimeout(scrollSaveTimer)
    scrollEl?.removeEventListener('scroll', onScroll)
    stopRestoreListener()
    const id = noteId()
    if (id) {
      void window.wanwu.notes.popout.saveScroll({
        noteId: id,
        scrollTop: readNoteEditorScrollTop()
      })
    }
  })

  return { readNoteEditorScrollTop, applyNoteEditorScrollTop }
}
