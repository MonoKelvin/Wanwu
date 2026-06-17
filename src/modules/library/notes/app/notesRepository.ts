/**
 * 便笺仓储：抽象 store/IPC，供命令层与测试替换实现。
 */
import { useNotesStore } from '@modules/library/notes/services/notesStore'
import type { NoteCreateInput, NoteImage, NoteItem } from '@modules/library/notes/domain/types'

export interface INotesRepositoryPort {
  loadAll(): Promise<NoteItem[]>
  createNote(input?: NoteCreateInput): Promise<NoteItem>
  updateNote(
    id: string,
    patch: Partial<Pick<NoteItem, 'title' | 'content' | 'pinned' | 'color'>> & {
      touchUpdatedAt?: boolean
    }
  ): Promise<NoteItem | null>
  deleteNote(id: string): Promise<boolean>
  addImage(noteId: string, filePath: string): Promise<NoteImage>
  removeImage(imageId: string): Promise<boolean>
  setSelected(noteId: string | null): void
  findNote(noteId: string): NoteItem | null
}

/** 默认实现：Pinia store + Electron IPC */
export class PiniaNotesRepository implements INotesRepositoryPort {
  private get store() {
    return useNotesStore()
  }

  loadAll(): Promise<NoteItem[]> {
    return this.store.loadAll()
  }

  createNote(input?: NoteCreateInput): Promise<NoteItem> {
    return this.store.createNote(input)
  }

  updateNote(
    id: string,
    patch: Parameters<INotesRepositoryPort['updateNote']>[1]
  ): Promise<NoteItem | null> {
    return this.store.updateNote(id, patch)
  }

  deleteNote(id: string): Promise<boolean> {
    return this.store.deleteNote(id)
  }

  addImage(noteId: string, filePath: string): Promise<NoteImage> {
    return this.store.addImage(noteId, filePath)
  }

  removeImage(imageId: string): Promise<boolean> {
    return this.store.removeImage(imageId)
  }

  setSelected(noteId: string | null): void {
    this.store.setSelected(noteId)
  }

  findNote(noteId: string): NoteItem | null {
    return this.store.notes.find((note) => note.id === noteId) ?? null
  }
}
