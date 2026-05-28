import { randomUUID } from 'crypto'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, extname, join } from 'path'
import type {
  NoteCreateInput,
  NoteImage,
  NoteItem,
  NoteUpdateInput
} from '../../../src/shared/types/notes'
import type { UserDataGateway } from '../storage/userDataGateway'

export interface NotesStorage {
  listNotes(): NoteItem[]
  createNote(input?: NoteCreateInput): NoteItem
  updateNote(input: NoteUpdateInput): NoteItem | null
  deleteNote(id: string): boolean
  addImage(noteId: string, filePath: string): NoteImage
  removeImage(imageId: string): boolean
}

export class SqliteNotesStorage implements NotesStorage {
  constructor(
    private readonly userData: UserDataGateway,
    private readonly basePath: string
  ) {}

  listNotes(): NoteItem[] {
    return this.userData.listNotes()
  }

  createNote(input?: NoteCreateInput): NoteItem {
    return this.userData.createNote(input)
  }

  updateNote(input: NoteUpdateInput): NoteItem | null {
    return this.userData.updateNote(input)
  }

  deleteNote(id: string): boolean {
    const note = this.userData.listNotes().find((item) => item.id === id)
    if (!note) return false
    for (const image of note.images) {
      this.deleteMediaFile(image.relativePath)
    }
    return this.userData.deleteNote(id)
  }

  addImage(noteId: string, filePath: string): NoteImage {
    if (!existsSync(filePath)) {
      throw new Error('source_not_found')
    }
    const ext = extname(filePath).toLowerCase() || '.png'
    const relativePath = this.copyToMedia(noteId, filePath, ext)
    return this.userData.addNoteImage(noteId, relativePath)
  }

  removeImage(imageId: string): boolean {
    const image = this.userData.getNoteImage(imageId)
    if (!image) return false
    this.deleteMediaFile(image.relativePath)
    return this.userData.removeNoteImage(imageId)
  }

  private copyToMedia(noteId: string, sourceFilePath: string, ext: string): string {
    const relativeDir = join('notes', noteId)
    const relativePath = join(relativeDir, `${randomUUID()}${ext}`).replace(/\\/g, '/')
    const targetPath = join(this.basePath, 'media', relativePath)
    mkdirSync(dirname(targetPath), { recursive: true })
    copyFileSync(sourceFilePath, targetPath)
    return relativePath
  }

  private deleteMediaFile(relativePath: string): void {
    const fullPath = join(this.basePath, 'media', relativePath)
    if (existsSync(fullPath)) {
      rmSync(fullPath, { force: true })
    }
  }
}
