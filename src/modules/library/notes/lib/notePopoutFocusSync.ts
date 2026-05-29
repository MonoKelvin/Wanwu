type NoteSelectHandler = (noteId: string) => void | Promise<void>

let selectHandler: NoteSelectHandler | null = null

export function registerNotePopoutSelectHandler(handler: NoteSelectHandler): () => void {
  selectHandler = handler
  return () => {
    if (selectHandler === handler) selectHandler = null
  }
}

export async function applyPopoutFocusSelection(noteId: string): Promise<void> {
  if (selectHandler) {
    await selectHandler(noteId)
    return
  }
  const { useNotesStore } = await import('@shared/stores/notes')
  useNotesStore().setSelected(noteId)
}
