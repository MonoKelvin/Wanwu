import { randomUUID } from 'crypto'
import type { DatabaseService } from './database'
import { LIBRARY_CATEGORIES } from './database'

export interface CategoryDto {
  id: string
  name: string
  icon?: string
  parentId: string | null
  children?: CategoryDto[]
}

export interface ItemDto {
  id: string
  categoryId: string
  subCategoryId: string | null
  source: 'library' | 'custom' | 'rss'
  name: string
  summary: string | null
  description: string | null
  tags: string[]
  coverPath: string | null
  createdAt: string
  updatedAt: string
}

export class LibraryService {
  constructor(private readonly db: DatabaseService) {}

  listCategories(): CategoryDto[] {
    return LIBRARY_CATEGORIES.map((c) => {
      const libDb = this.db.getLibraryDb(c.id)
      const children: CategoryDto[] = []
      if (libDb) {
        const subs = libDb
          .prepare('SELECT id, name, parent_id as parentId FROM categories WHERE parent_id IS NOT NULL ORDER BY sort_order')
          .all() as Array<{ id: string; name: string; parentId: string }>
        children.push(
          ...subs.map((s) => ({
            id: s.id,
            name: s.name,
            parentId: s.parentId
          }))
        )
      }
      return {
        id: c.id,
        name: c.name,
        icon: c.icon,
        parentId: null,
        children
      }
    })
  }

  listItems(categoryId: string, subCategoryId?: string): ItemDto[] {
    const libDb = this.db.getLibraryDb(categoryId)
    if (!libDb) return []

    let rows: Array<Record<string, unknown>>
    if (subCategoryId) {
      rows = libDb
        .prepare(
          `SELECT id, category_id, sub_category_id, name, summary, description, tags, cover_path, created_at, updated_at
           FROM items WHERE category_id = ? AND sub_category_id = ? ORDER BY name`
        )
        .all(categoryId, subCategoryId) as Array<Record<string, unknown>>
    } else {
      rows = libDb
        .prepare(
          `SELECT id, category_id, sub_category_id, name, summary, description, tags, cover_path, created_at, updated_at
           FROM items WHERE category_id = ? ORDER BY name`
        )
        .all(categoryId) as Array<Record<string, unknown>>
    }

    return rows.map((r) => this.rowToItem(r))
  }

  getItem(id: string): ItemDto | null {
    for (const cat of LIBRARY_CATEGORIES) {
      const libDb = this.db.getLibraryDb(cat.id)
      if (!libDb) continue
      const row = libDb
        .prepare(
          `SELECT id, category_id, sub_category_id, name, summary, description, tags, cover_path, created_at, updated_at
           FROM items WHERE id = ?`
        )
        .get(id) as Record<string, unknown> | undefined
      if (row) return this.rowToItem(row)
    }
    return null
  }

  updateItem(item: ItemDto): ItemDto {
    const libDb = this.db.getLibraryDb(item.categoryId)
    if (!libDb) throw new Error('分类不存在')
    const now = new Date().toISOString()
    libDb
      .prepare(
        `UPDATE items SET name = ?, summary = ?, description = ?, tags = ?, updated_at = ? WHERE id = ?`
      )
      .run(item.name, item.summary, item.description, JSON.stringify(item.tags), now, item.id)
    return { ...item, updatedAt: now }
  }

  createItem(
    partial: Pick<ItemDto, 'categoryId' | 'subCategoryId' | 'name' | 'summary' | 'description' | 'tags'>
  ): ItemDto {
    const libDb = this.db.getLibraryDb(partial.categoryId)
    if (!libDb) throw new Error('分类不存在')
    const id = randomUUID()
    const now = new Date().toISOString()
    libDb
      .prepare(
        `INSERT INTO items (id, category_id, sub_category_id, name, summary, description, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        partial.categoryId,
        partial.subCategoryId,
        partial.name,
        partial.summary,
        partial.description,
        JSON.stringify(partial.tags ?? []),
        now,
        now
      )
    return {
      id,
      categoryId: partial.categoryId,
      subCategoryId: partial.subCategoryId,
      source: 'library',
      name: partial.name,
      summary: partial.summary ?? null,
      description: partial.description ?? null,
      tags: partial.tags ?? [],
      coverPath: null,
      createdAt: now,
      updatedAt: now
    }
  }

  checkCategoryDuplicate(name: string): { duplicate: boolean; suggestModule?: string; categoryId?: string } {
    const match = LIBRARY_CATEGORIES.find((c) => c.name === name.trim())
    if (match) {
      return { duplicate: true, suggestModule: 'library', categoryId: match.id }
    }
    return { duplicate: false }
  }

  private rowToItem(r: Record<string, unknown>): ItemDto {
    let tags: string[] = []
    try {
      tags = JSON.parse((r.tags as string) || '[]')
    } catch {
      tags = []
    }
    return {
      id: r.id as string,
      categoryId: r.category_id as string,
      subCategoryId: (r.sub_category_id as string) ?? null,
      source: 'library',
      name: r.name as string,
      summary: (r.summary as string) ?? null,
      description: (r.description as string) ?? null,
      tags,
      coverPath: (r.cover_path as string) ?? null,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string
    }
  }
}
