import { randomUUID } from 'crypto'
import type { DatabaseService } from './database'
import { LIBRARY_CATEGORIES } from './database'
import { resolveItemCoverRelative, resolveMediaRelative, toLibraryMediaUrl } from './libraryMedia'
import { readItemMarkdown, writeItemMarkdown } from './libraryContent'
import { copyUserImageToLibrary } from './libraryItemUpload'
import type { MediaAttribution, ItemMediaAsset } from '../../src/shared/types/unsplash'

export interface CategoryDto {
  id: string
  name: string
  icon?: string
  parentId: string | null
  children?: CategoryDto[]
}

export interface LibrarySearchHit {
  id: string
  name: string
  summary: string | null
  categoryId: string
  categoryName: string
  subCategoryName: string | null
}

export interface FavoriteGroupDto {
  id: string
  name: string
  sortOrder: number
  items: FavoriteEntryDto[]
}

export interface FavoriteEntryDto {
  id: string
  itemId: string
  source: 'library' | 'rss'
  groupId: string
  createdAt: string
  item: {
    id: string
    name: string
    summary: string | null
    coverPath: string | null
    categoryId: string
    subCategoryName: string | null
    source: 'library' | 'rss'
  } | null
}

export interface ItemDto {
  id: string
  categoryId: string
  subCategoryId: string | null
  subCategoryName?: string | null
  slug?: string | null
  source: 'library' | 'rss'
  name: string
  summary: string | null
  description: string | null
  tags: string[]
  specs: Record<string, string>
  coverPath: string | null
  coverAttribution: MediaAttribution | null
  gallery: string[]
  galleryAssets: ItemMediaAsset[]
  createdAt: string
  updatedAt: string
}

function parseAttribution(json: string | null | undefined): MediaAttribution | null {
  if (!json) return null
  try {
    return JSON.parse(json) as MediaAttribution
  } catch {
    return null
  }
}

export class LibraryService {
  constructor(private readonly db: DatabaseService) {}

  listCategories(): CategoryDto[] {
    return LIBRARY_CATEGORIES.map((c) => {
      const libDb = this.db.getLibraryDb(c.id)
      const children: CategoryDto[] = []
      if (libDb) {
        const subs = libDb
          .prepare(
            'SELECT id, name, parent_id as parentId FROM categories WHERE parent_id IS NOT NULL ORDER BY sort_order'
          )
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

    const sql = `SELECT id, category_id, sub_category_id, slug, name, summary, description, tags,
      cover_path, cover_attribution, specs, created_at, updated_at FROM items WHERE category_id = ?`
    let rows: Array<Record<string, unknown>>
    if (subCategoryId) {
      rows = libDb.prepare(`${sql} AND sub_category_id = ? ORDER BY name`).all(categoryId, subCategoryId) as Array<
        Record<string, unknown>
      >
    } else {
      rows = libDb.prepare(`${sql} ORDER BY name`).all(categoryId) as Array<Record<string, unknown>>
    }

    return rows.map((r) => this.rowToItem(libDb, r))
  }

  private mapFavoriteRow(row: {
    id: string
    item_id: string
    source: string
    group_id: string
    created_at: string
  }): FavoriteEntryDto {
    const source = row.source === 'rss' ? 'rss' : 'library'
    let item: FavoriteEntryDto['item'] = null

    if (source === 'library') {
      const full = this.getItem(row.item_id)
      if (full) {
        item = {
          id: full.id,
          name: full.name,
          summary: full.summary,
          coverPath: full.coverPath,
          categoryId: full.categoryId,
          subCategoryName: full.subCategoryName ?? null,
          source: 'library'
        }
      }
    }

    return {
      id: row.id,
      itemId: row.item_id,
      source,
      groupId: row.group_id,
      createdAt: row.created_at,
      item
    }
  }

  listFavoriteEntries(): FavoriteEntryDto[] {
    return this.db.listFavorites().map((row) => this.mapFavoriteRow(row))
  }

  listFavoriteGroups(): FavoriteGroupDto[] {
    const groups = this.db.listFavoriteGroups()
    const entries = this.listFavoriteEntries()
    const byGroup = new Map<string, FavoriteEntryDto[]>()
    for (const g of groups) byGroup.set(g.id, [])
    for (const entry of entries) {
      const list = byGroup.get(entry.groupId) ?? []
      list.push(entry)
      byGroup.set(entry.groupId, list)
    }
    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order,
      items: byGroup.get(g.id) ?? []
    }))
  }

  getItem(id: string): ItemDto | null {
    for (const cat of LIBRARY_CATEGORIES) {
      const libDb = this.db.getLibraryDb(cat.id)
      if (!libDb) continue
      const row = libDb
        .prepare(
          `SELECT id, category_id, sub_category_id, slug, name, summary, description, tags,
           cover_path, cover_attribution, specs, created_at, updated_at FROM items WHERE id = ?`
        )
        .get(id) as Record<string, unknown> | undefined
      if (row) return this.rowToItem(libDb, row)
    }
    return null
  }

  updateItem(item: ItemDto): ItemDto {
    const libDb = this.db.getLibraryDb(item.categoryId)
    if (!libDb) throw new Error('分类不存在')
    const now = new Date().toISOString()
    libDb
      .prepare(
        `UPDATE items SET name = ?, summary = ?, description = ?, tags = ?, specs = ?, updated_at = ? WHERE id = ?`
      )
      .run(
        item.name,
        item.summary,
        item.description,
        JSON.stringify(item.tags),
        JSON.stringify(item.specs ?? {}),
        now,
        item.id
      )

    const row = libDb.prepare('SELECT slug, cover_path FROM items WHERE id = ?').get(item.id) as
      | { slug: string | null; cover_path: string | null }
      | undefined
    const coverRel = resolveItemCoverRelative({
      coverPath: row?.cover_path ?? null,
      categoryId: item.categoryId,
      slug: row?.slug ?? item.slug ?? null
    })
    if (item.description != null) {
      writeItemMarkdown(coverRel, item.description)
    }

    return this.getItem(item.id) ?? { ...item, updatedAt: now }
  }

  uploadItemImage(itemId: string, sourceFilePath: string): ItemDto {
    const existing = this.getItem(itemId)
    if (!existing) throw new Error('物品不存在')

    const libDb = this.db.getLibraryDb(existing.categoryId)
    if (!libDb) throw new Error('分类不存在')

    const row = libDb.prepare('SELECT slug, cover_path FROM items WHERE id = ?').get(itemId) as {
      slug: string | null
      cover_path: string | null
    }

    const { relativePath, isCover } = copyUserImageToLibrary({
      itemId,
      categoryId: existing.categoryId,
      slug: row.slug,
      coverPathDb: row.cover_path,
      sourceFilePath
    })

    const now = new Date().toISOString()

    if (isCover) {
      libDb
        .prepare(
          'UPDATE items SET cover_path = ?, cover_attribution = NULL, updated_at = ? WHERE id = ?'
        )
        .run(relativePath, now, itemId)
    } else {
      const count = libDb
        .prepare('SELECT COUNT(*) AS c FROM item_media WHERE item_id = ?')
        .get(itemId) as { c: number }
      libDb
        .prepare(
          'INSERT INTO item_media (id, item_id, path, sort_order, attribution) VALUES (?, ?, ?, ?, ?)'
        )
        .run(randomUUID(), itemId, relativePath, count.c, null)
      libDb.prepare('UPDATE items SET updated_at = ? WHERE id = ?').run(now, itemId)
    }

    const updated = this.getItem(itemId)
    if (!updated) throw new Error('上传后读取失败')
    return updated
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
        `INSERT INTO items (id, category_id, sub_category_id, name, summary, description, tags, specs, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        partial.categoryId,
        partial.subCategoryId,
        partial.name,
        partial.summary,
        partial.description,
        JSON.stringify(partial.tags ?? []),
        '{}',
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
      specs: {},
      coverPath: null,
      coverAttribution: null,
      gallery: [],
      galleryAssets: [],
      createdAt: now,
      updatedAt: now
    }
  }

  searchItems(query: string, limit = 15): LibrarySearchHit[] {
    const term = query.trim()
    if (!term) return []

    const hits: LibrarySearchHit[] = []
    for (const cat of LIBRARY_CATEGORIES) {
      const libDb = this.db.getLibraryDb(cat.id)
      if (!libDb) continue
      const rows = libDb
        .prepare(
          `SELECT i.id, i.name, i.summary, i.sub_category_id, sc.name AS sub_name
           FROM items i
           LEFT JOIN categories sc ON sc.id = i.sub_category_id
           WHERE i.name LIKE '%' || ? || '%' COLLATE NOCASE
              OR IFNULL(i.summary, '') LIKE '%' || ? || '%' COLLATE NOCASE
              OR IFNULL(i.tags, '') LIKE '%' || ? || '%' COLLATE NOCASE
           ORDER BY i.name
           LIMIT ?`
        )
        .all(term, term, term, limit) as Array<{
        id: string
        name: string
        summary: string | null
        sub_category_id: string | null
        sub_name: string | null
      }>

      for (const r of rows) {
        hits.push({
          id: r.id,
          name: r.name,
          summary: r.summary,
          categoryId: cat.id,
          categoryName: cat.name,
          subCategoryName: r.sub_name
        })
        if (hits.length >= limit) return hits
      }
    }
    return hits.slice(0, limit)
  }

  private rowToItem(libDb: import('better-sqlite3').Database, r: Record<string, unknown>): ItemDto {
    let tags: string[] = []
    let specs: Record<string, string> = {}
    try {
      tags = JSON.parse((r.tags as string) || '[]')
    } catch {
      tags = []
    }
    try {
      specs = JSON.parse((r.specs as string) || '{}')
    } catch {
      specs = {}
    }

    const subId = (r.sub_category_id as string) ?? null
    let subCategoryName: string | null = null
    if (subId) {
      const sub = libDb.prepare('SELECT name FROM categories WHERE id = ?').get(subId) as
        | { name: string }
        | undefined
      subCategoryName = sub?.name ?? null
    }

    const itemId = r.id as string
    const galleryRows = libDb
      .prepare('SELECT path, attribution FROM item_media WHERE item_id = ? ORDER BY sort_order')
      .all(itemId) as Array<{ path: string; attribution: string | null }>

    const coverRel = resolveItemCoverRelative({
      coverPath: (r.cover_path as string) ?? null,
      categoryId: r.category_id as string,
      slug: (r.slug as string) ?? null
    })
    const coverAttribution = parseAttribution(r.cover_attribution as string | null)
    const description = readItemMarkdown(coverRel, (r.description as string) ?? null)

    const galleryAssets: ItemMediaAsset[] = []
    const gallery: string[] = []
    for (const row of galleryRows) {
      const mediaRel = resolveMediaRelative(row.path) ?? row.path
      const url = toLibraryMediaUrl(mediaRel)
      if (!url) continue
      gallery.push(url)
      galleryAssets.push({
        url,
        attribution: parseAttribution(row.attribution)
      })
    }

    return {
      id: itemId,
      categoryId: r.category_id as string,
      subCategoryId: subId,
      subCategoryName,
      slug: (r.slug as string) ?? null,
      source: 'library',
      name: r.name as string,
      summary: (r.summary as string) ?? null,
      description,
      tags,
      specs,
      coverPath: toLibraryMediaUrl(coverRel),
      coverAttribution,
      gallery,
      galleryAssets,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string
    }
  }
}
