import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import { canonicalNoteBodyContent } from '@modules/library/notes/lib/noteBodyContent'
import type {
  NoteCreateInput,
  NoteImage,
  NoteItem,
  NoteUpdateInput
} from '@modules/library/notes/domain/types'
import type { DatabaseService } from '../../../../../electron/services/core/database'

function normalizeNoteColor(color: unknown): NoteItem['color'] {
  const value = typeof color === 'string' ? color : ''
  if (
    value === 'yellow' ||
    value === 'green' ||
    value === 'blue' ||
    value === 'pink' ||
    value === 'purple' ||
    value === 'gray' ||
    value === 'orange' ||
    value === 'teal' ||
    value === 'red'
  ) {
    return value
  }
  return 'yellow'
}

function mapNoteRow(
  row: {
    id: string
    title: string
    content: string
    color: string
    pinned: number
    created_at: string
    updated_at: string
  },
  images: NoteImage[]
): NoteItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    color: normalizeNoteColor(row.color),
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    images
  }
}

export class NotesSqliteRepository {
  constructor(private readonly dbHost: DatabaseService) {}

  listNotes(): NoteItem[] {
    return this.dbHost.withUserDatabase((userDb) => {
      const rows = userDb
        .prepare(
          `SELECT id, title, content, color, pinned, created_at, updated_at
           FROM notes
           ORDER BY pinned DESC, updated_at DESC`
        )
        .all() as Array<{
        id: string
        title: string
        content: string
        color: string
        pinned: number
        created_at: string
        updated_at: string
      }>
      const images = userDb
        .prepare(
          `SELECT id, note_id, relative_path, created_at
           FROM note_images
           ORDER BY created_at ASC`
        )
        .all() as Array<{ id: string; note_id: string; relative_path: string; created_at: string }>
      const imagesByNote = new Map<string, NoteImage[]>()
      for (const img of images) {
        const list = imagesByNote.get(img.note_id) ?? []
        list.push({
          id: img.id,
          noteId: img.note_id,
          relativePath: img.relative_path,
          createdAt: img.created_at
        })
        imagesByNote.set(img.note_id, list)
      }
      return rows.map((row) => mapNoteRow(row, imagesByNote.get(row.id) ?? []))
    })
  }

  getNote(id: string): NoteItem | null {
    return this.dbHost.withUserDatabase((userDb) => {
      const row = userDb
        .prepare(
          `SELECT id, title, content, color, pinned, created_at, updated_at
           FROM notes
           WHERE id = ?`
        )
        .get(id) as
        | {
            id: string
            title: string
            content: string
            color: string
            pinned: number
            created_at: string
            updated_at: string
          }
        | undefined
      if (!row) return null
      const images = userDb
        .prepare(
          `SELECT id, note_id, relative_path, created_at
           FROM note_images
           WHERE note_id = ?
           ORDER BY created_at ASC`
        )
        .all(id) as Array<{ id: string; note_id: string; relative_path: string; created_at: string }>
      return mapNoteRow(
        row,
        images.map((img) => ({
          id: img.id,
          noteId: img.note_id,
          relativePath: img.relative_path,
          createdAt: img.created_at
        }))
      )
    })
  }

  createNote(input?: NoteCreateInput): NoteItem {
    const id = randomUUID()
    const now = new Date().toISOString()
    const title = input?.title?.trim() ?? ''
    const content = canonicalNoteBodyContent(input?.content ?? '')
    const color = normalizeNoteColor(input?.color)
    const pinned = input?.pinned ? 1 : 0
    this.dbHost.withUserDatabase((userDb) => {
      userDb
        .prepare(
          `INSERT INTO notes (id, title, content, color, pinned, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(id, title, content, color, pinned, now, now)
    })
    return this.getNote(id) as NoteItem
  }

  updateNote(input: NoteUpdateInput): NoteItem | null {
    const current = this.getNote(input.id)
    if (!current) return null
    const touchUpdatedAt = input.touchUpdatedAt !== false
    const now = touchUpdatedAt ? new Date().toISOString() : current.updatedAt
    const title = input.title?.trim() ?? current.title
    const content =
      input.content !== undefined ? canonicalNoteBodyContent(input.content) : current.content
    const color = normalizeNoteColor(input.color ?? current.color)
    const pinned = input.pinned ?? current.pinned
    this.dbHost.withUserDatabase((userDb) => {
      userDb
        .prepare(
          `UPDATE notes
           SET title = ?, content = ?, color = ?, pinned = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(title, content, color, pinned ? 1 : 0, now, input.id)
    })
    return this.getNote(input.id)
  }

  deleteNote(id: string): boolean {
    const note = this.getNote(id)
    if (!note) return false
    this.dbHost.withUserDatabase((userDb) => {
      userDb.prepare('DELETE FROM note_images WHERE note_id = ?').run(id)
      userDb.prepare('DELETE FROM notes WHERE id = ?').run(id)
    })
    return true
  }

  addNoteImage(noteId: string, relativePath: string): NoteImage {
    const note = this.getNote(noteId)
    if (!note) {
      throw new Error('便笺不存在')
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    this.dbHost.withUserDatabase((userDb) => {
      userDb
        .prepare(
          `INSERT INTO note_images (id, note_id, relative_path, created_at)
           VALUES (?, ?, ?, ?)`
        )
        .run(id, noteId, relativePath, now)
      userDb.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(now, noteId)
    })
    return {
      id,
      noteId,
      relativePath,
      createdAt: now
    }
  }

  getNoteImage(imageId: string): NoteImage | null {
    return this.dbHost.withUserDatabase((userDb) => {
      const row = userDb
        .prepare(
          `SELECT id, note_id, relative_path, created_at
           FROM note_images
           WHERE id = ?`
        )
        .get(imageId) as
        | { id: string; note_id: string; relative_path: string; created_at: string }
        | undefined
      if (!row) return null
      return {
        id: row.id,
        noteId: row.note_id,
        relativePath: row.relative_path,
        createdAt: row.created_at
      }
    })
  }

  removeNoteImage(imageId: string): boolean {
    const image = this.getNoteImage(imageId)
    if (!image) return false
    this.dbHost.withUserDatabase((userDb) => {
      userDb.prepare('DELETE FROM note_images WHERE id = ?').run(imageId)
      userDb.prepare('UPDATE notes SET updated_at = ? WHERE id = ?').run(
        new Date().toISOString(),
        image.noteId
      )
    })
    return true
  }
}
