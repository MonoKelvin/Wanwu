import { randomUUID } from 'crypto'
import { copyFileSync, existsSync, mkdirSync, rmSync } from 'fs'
import { dirname, extname, join } from 'path'
import type {
  NoteCreateInput,
  NoteImage,
  NoteItem,
  NoteUpdateInput
} from '@modules/library/notes/domain/types'
import {
  ensureWanwuDataLayout,
  getWanwuPathLayout
} from '../../../../../../electron/services/data/paths'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'
import type { NotesSqliteRepository } from '../sqliteNotesRepository'

export interface NotesStorage {
  listNotes(): NoteItem[]
  createNote(input?: NoteCreateInput): NoteItem
  updateNote(input: NoteUpdateInput): NoteItem | null
  deleteNote(id: string): boolean
  addImage(noteId: string, filePath: string): NoteImage
  removeImage(imageId: string): boolean
}

export class SqliteNotesStorage implements NotesStorage {
  private readonly layout: WanwuPathLayout

  constructor(
    private readonly repository: NotesSqliteRepository,
    basePath?: string
  ) {
    const root = ensureWanwuDataLayout(basePath)
    this.layout = getWanwuPathLayout(root)
  }

  listNotes(): NoteItem[] {
    return this.repository.listNotes()
  }

  createNote(input?: NoteCreateInput): NoteItem {
    return this.repository.createNote(input)
  }

  updateNote(input: NoteUpdateInput): NoteItem | null {
    return this.repository.updateNote(input)
  }

  deleteNote(id: string): boolean {
    const note = this.repository.listNotes().find((item) => item.id === id)
    if (!note) return false
    for (const image of note.images) {
      this.deleteMediaFile(image.relativePath)
    }
    return this.repository.deleteNote(id)
  }

  addImage(noteId: string, filePath: string): NoteImage {
    if (!existsSync(filePath)) {
      throw new Error('source_not_found')
    }
    const ext = extname(filePath).toLowerCase() || '.png'
    const relativePath = this.copyToMedia(noteId, filePath, ext)
    return this.repository.addNoteImage(noteId, relativePath)
  }

  removeImage(imageId: string): boolean {
    const image = this.repository.getNoteImage(imageId)
    if (!image) return false
    this.deleteMediaFile(image.relativePath)
    return this.repository.removeNoteImage(imageId)
  }

  private copyToMedia(noteId: string, sourceFilePath: string, ext: string): string {
    const relativeDir = join('notes', noteId)
    const relativePath = join(relativeDir, `${randomUUID()}${ext}`).replace(/\\/g, '/')
    const targetPath = join(this.layout.media, relativePath)
    mkdirSync(dirname(targetPath), { recursive: true })
    copyFileSync(sourceFilePath, targetPath)
    return relativePath
  }

  private deleteMediaFile(relativePath: string): void {
    const fullPath = join(this.layout.media, relativePath)
    if (existsSync(fullPath)) {
      rmSync(fullPath, { force: true })
    }
  }
}
