import type { NoteCreateInput, NoteItem, NoteUpdateInput } from '../../../src/shared/types/notes'
import type { NotesStorage } from './storage'

export class NotesService {
  constructor(private readonly storage: NotesStorage) {}

  listNotes(): NoteItem[] {
    return this.storage.listNotes()
  }

  createNote(input?: NoteCreateInput): NoteItem {
    return this.storage.createNote(input)
  }

  updateNote(input: NoteUpdateInput): NoteItem | null {
    return this.storage.updateNote(input)
  }

  deleteNote(id: string): boolean {
    return this.storage.deleteNote(id)
  }

  addImage(noteId: string, filePath: string) {
    return this.storage.addImage(noteId, filePath)
  }

  removeImage(imageId: string): boolean {
    return this.storage.removeImage(imageId)
  }
}
