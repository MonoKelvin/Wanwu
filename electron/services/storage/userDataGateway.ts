import type { DatabaseService } from '../core/database'
import type { NoteCreateInput, NoteImage, NoteItem, NoteUpdateInput } from '../../../src/shared/types/notes'
import type { AppSettings } from '../../../src/shared/types/settings'

export interface UserDataGateway {
  getProfile(): {
    nickname: string
    bio: string
    avatarPath: string | null
    backgroundPath: string | null
    backgroundConfig: Record<string, unknown> | null
  } | null
  updateProfile(profile: {
    nickname: string
    bio: string
    avatarPath?: string | null
    backgroundPath?: string | null
    backgroundConfig?: Record<string, unknown> | null
  }): void
  getAppSettings(): Record<string, unknown>
  updateAppSettings(settings: AppSettings): void
  listNotes(): NoteItem[]
  createNote(input?: NoteCreateInput): NoteItem
  updateNote(input: NoteUpdateInput): NoteItem | null
  deleteNote(id: string): boolean
  addNoteImage(noteId: string, relativePath: string): NoteImage
  getNoteImage(imageId: string): NoteImage | null
  removeNoteImage(imageId: string): boolean
}

export class SqliteUserDataGateway implements UserDataGateway {
  constructor(private readonly db: DatabaseService) {}

  getProfile() {
    return this.db.getProfile()
  }

  updateProfile(profile: {
    nickname: string
    bio: string
    avatarPath?: string | null
    backgroundPath?: string | null
    backgroundConfig?: Record<string, unknown> | null
  }): void {
    this.db.updateProfile(profile)
  }

  getAppSettings(): Record<string, unknown> {
    return this.db.getAppSettings()
  }

  updateAppSettings(settings: AppSettings): void {
    this.db.updateAppSettings(settings)
  }

  listNotes(): NoteItem[] {
    return this.db.listNotes()
  }

  createNote(input?: NoteCreateInput): NoteItem {
    return this.db.createNote(input)
  }

  updateNote(input: NoteUpdateInput): NoteItem | null {
    return this.db.updateNote(input)
  }

  deleteNote(id: string): boolean {
    return this.db.deleteNote(id)
  }

  addNoteImage(noteId: string, relativePath: string): NoteImage {
    return this.db.addNoteImage(noteId, relativePath)
  }

  getNoteImage(imageId: string): NoteImage | null {
    return this.db.getNoteImage(imageId)
  }

  removeNoteImage(imageId: string): boolean {
    return this.db.removeNoteImage(imageId)
  }
}
