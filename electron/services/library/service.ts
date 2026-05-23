/** 图鉴条目查询、收藏聚合、用户上传配图 */
import { randomUUID } from 'crypto'
import type { DatabaseService } from '../core/database'
import { loadLibraryCategories } from './seed'
import { resolveItemCoverRelative, resolveMediaRelative, toLibraryMediaUrl } from '../media/library'
import { readItemMarkdown, writeItemMarkdown } from './content'
import { copyUserImageToLibrary } from './upload'
import type { MediaAttribution, ItemMediaAsset } from '../../../src/shared/types/unsplash'

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

const LIST_ITEM_SQL = `SELECT i.id, i.category_id, i.sub_category_id, i.slug, i.name, i.summary, i.tags,
  i.cover_path, i.cover_attribution, i.created_at, i.updated_at,
  sc.name AS sub_category_name
FROM items i
LEFT JOIN categories sc ON sc.id = i.sub_category_id
WHERE i.category_id = ?`

const LIST_ITEM_BY_ID_PREFIX = `SELECT i.id, i.category_id, i.sub_category_id, i.slug, i.name, i.summary, i.tags,
  i.cover_path, i.cover_attribution, i.created_at, i.updated_at,
  sc.name AS sub_category_name
FROM items i
LEFT JOIN categories sc ON sc.id = i.sub_category_id
WHERE i.id IN `

const ITEM_BY_ID_SQL = `SELECT id, category_id, sub_category_id, slug, name, summary, description, tags,
  cover_path, cover_attribution, content_file, specs, created_at, updated_at FROM items WHERE id = ?`

const IN_QUERY_CHUNK = 400

export class LibraryService {
  constructor(private readonly db: DatabaseService) {}

  /** 条目 id → 分类 id，加速重复 getItem / 收藏查询 */
  private readonly itemCategoryCache = new Map<string, string>()

  listCategories(): CategoryDto[] {
    const file = loadLibraryCategories()
    if (file?.categories?.length) {
      return file.categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        parentId: null,
        children: c.subcategories.map((s) => ({
          id: s.id,
          name: s.name,
          parentId: c.id
        }))
      }))
    }

    const fromDb: CategoryDto[] = []
    for (const categoryId of this.db.listLibraryCategoryIds()) {
      const libDb = this.db.getLibraryDb(categoryId)
      if (!libDb) continue
      const root = libDb
        .prepare('SELECT id, name FROM categories WHERE parent_id IS NULL LIMIT 1')
        .get() as { id: string; name: string } | undefined
      const rootId = root?.id ?? categoryId
      const subs = libDb
        .prepare(
          'SELECT id, name FROM categories WHERE parent_id = ? ORDER BY sort_order ASC, name ASC'
        )
        .all(rootId) as Array<{ id: string; name: string }>
      fromDb.push({
        id: categoryId,
        name: root?.name ?? categoryId,
        icon: 'layers',
        parentId: null,
        children: subs.map((s) => ({
          id: s.id,
          name: s.name,
          parentId: categoryId
        }))
      })
    }
    if (fromDb.length > 0) return fromDb

    return []
  }

  listItems(categoryId: string, subCategoryId?: string): ItemDto[] {
    const libDb = this.db.getLibraryDb(categoryId)
    if (!libDb) return []

    let rows: Array<Record<string, unknown>>
    if (subCategoryId) {
      rows = libDb
        .prepare(`${LIST_ITEM_SQL} AND i.sub_category_id = ? ORDER BY i.name`)
        .all(categoryId, subCategoryId) as Array<Record<string, unknown>>
    } else {
      rows = libDb.prepare(`${LIST_ITEM_SQL} ORDER BY i.name`).all(categoryId) as Array<
        Record<string, unknown>
      >
    }

    for (const r of rows) {
      this.itemCategoryCache.set(r.id as string, categoryId)
    }
    return rows.map((r) => this.rowToItemList(libDb, r))
  }

  /** 批量查图鉴条目摘要（收藏列表等） */
  private findLibraryListSummariesByIds(ids: Iterable<string>): Map<string, FavoriteEntryDto['item']> {
    const out = new Map<string, FavoriteEntryDto['item']>()
    const pending = new Set(ids)
    if (pending.size === 0) return out

    for (const categoryId of this.db.listLibraryCategoryIds()) {
      if (pending.size === 0) break
      const libDb = this.db.getLibraryDb(categoryId)
      if (!libDb) continue

      const batch = Array.from(pending)
      for (let i = 0; i < batch.length; i += IN_QUERY_CHUNK) {
        const chunk = batch.slice(i, i + IN_QUERY_CHUNK)
        const placeholders = chunk.map(() => '?').join(',')
        const rows = libDb
          .prepare(`${LIST_ITEM_BY_ID_PREFIX}(${placeholders})`)
          .all(...chunk) as Array<Record<string, unknown>>

        for (const r of rows) {
          const dto = this.rowToItemList(libDb, r)
          this.itemCategoryCache.set(dto.id, dto.categoryId)
          pending.delete(dto.id)
          out.set(dto.id, {
            id: dto.id,
            name: dto.name,
            summary: dto.summary,
            coverPath: dto.coverPath,
            categoryId: dto.categoryId,
            subCategoryName: dto.subCategoryName ?? null,
            source: 'library'
          })
        }
      }
    }
    return out
  }

  /** 列表场景：不读 content.md、不加载 gallery、不扫目录找封面 */
  private rowToItemList(libDb: import('better-sqlite3').Database, r: Record<string, unknown>): ItemDto {
    let tags: string[] = []
    try {
      tags = JSON.parse((r.tags as string) || '[]')
    } catch {
      tags = []
    }

    const subId = (r.sub_category_id as string) ?? null
    let subCategoryName = (r.sub_category_name as string | undefined) ?? null
    if (subCategoryName == null && subId) {
      const sub = libDb.prepare('SELECT name FROM categories WHERE id = ?').get(subId) as
        | { name: string }
        | undefined
      subCategoryName = sub?.name ?? null
    }

    const coverRel = resolveItemCoverRelative({
      coverPath: (r.cover_path as string) ?? null,
      categoryId: r.category_id as string,
      slug: (r.slug as string) ?? null,
      allowDiscover: false
    })

    return {
      id: r.id as string,
      categoryId: r.category_id as string,
      subCategoryId: subId,
      subCategoryName,
      slug: (r.slug as string) ?? null,
      source: 'library',
      name: r.name as string,
      summary: (r.summary as string) ?? null,
      description: null,
      tags,
      specs: {},
      coverPath: toLibraryMediaUrl(coverRel),
      coverAttribution: parseAttribution(r.cover_attribution as string | null),
      gallery: [],
      galleryAssets: [],
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string
    }
  }

  private mapFavoriteRow(
    row: {
      id: string
      item_id: string
      source: string
      group_id: string
      created_at: string
    },
    libraryItems: Map<string, FavoriteEntryDto['item']>
  ): FavoriteEntryDto {
    const source = row.source === 'rss' ? 'rss' : 'library'
    const item = source === 'library' ? (libraryItems.get(row.item_id) ?? null) : null

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
    const rows = this.db.listFavorites()
    const libraryIds = rows.filter((r) => r.source !== 'rss').map((r) => r.item_id)
    const libraryItems = this.findLibraryListSummariesByIds(libraryIds)
    return rows.map((row) => this.mapFavoriteRow(row, libraryItems))
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
    const cachedCategory = this.itemCategoryCache.get(id)
    if (cachedCategory) {
      const libDb = this.db.getLibraryDb(cachedCategory)
      if (libDb) {
        const row = libDb.prepare(ITEM_BY_ID_SQL).get(id) as Record<string, unknown> | undefined
        if (row) return this.rowToItem(libDb, row)
      }
      this.itemCategoryCache.delete(id)
    }

    for (const categoryId of this.db.listLibraryCategoryIds()) {
      const libDb = this.db.getLibraryDb(categoryId)
      if (!libDb) continue
      const row = libDb.prepare(ITEM_BY_ID_SQL).get(id) as Record<string, unknown> | undefined
      if (row) {
        this.itemCategoryCache.set(id, categoryId)
        return this.rowToItem(libDb, row)
      }
    }
    return null
  }

  updateItem(item: ItemDto): ItemDto {
    const libDb = this.db.getLibraryDb(item.categoryId)
    if (!libDb) throw new Error('分类不存在')
    const now = new Date().toISOString()
    const rowBefore = libDb.prepare('SELECT slug, cover_path, content_file FROM items WHERE id = ?').get(item.id) as
      | { slug: string | null; cover_path: string | null; content_file: string | null }
      | undefined

    libDb
      .prepare(
        `UPDATE items SET name = ?, summary = ?, description = ?, tags = ?, specs = ?, updated_at = ? WHERE id = ?`
      )
      .run(item.name, item.summary, null, JSON.stringify(item.tags), JSON.stringify(item.specs ?? {}), now, item.id)

    const coverRel = resolveItemCoverRelative({
      coverPath: rowBefore?.cover_path ?? null,
      categoryId: item.categoryId,
      slug: rowBefore?.slug ?? item.slug ?? null
    })
    if (item.description != null) {
      writeItemMarkdown(coverRel, item.description, rowBefore?.content_file ?? null)
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
    for (const categoryId of this.db.listLibraryCategoryIds()) {
      const libDb = this.db.getLibraryDb(categoryId)
      if (!libDb) continue
      const root = libDb
        .prepare('SELECT name FROM categories WHERE parent_id IS NULL LIMIT 1')
        .get() as { name: string } | undefined
      const categoryName = root?.name ?? categoryId
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
          categoryId,
          categoryName,
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
    const description = readItemMarkdown(
      coverRel,
      (r.description as string) ?? null,
      (r.content_file as string) ?? null
    )

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
