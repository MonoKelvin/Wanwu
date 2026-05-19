/**
 * 种子配置：assets/seed/library/items/{categoryId}/{slug}.json
 */
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { ensureItemId } from './stable-id.mjs'
import { formatDescription } from './seed-utils.mjs'

const SEED_ROOT = 'assets/seed/library'
const ITEMS_DIR = 'items'

export function seedLibraryDir(root) {
  return join(root, SEED_ROOT)
}

export function itemsRoot(root) {
  return join(seedLibraryDir(root), ITEMS_DIR)
}

/** @param {string} root */
export function listItemCategories(root) {
  const dir = itemsRoot(root)
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
    .map((d) => d.name)
    .sort()
}

function loadCategoryDefaults(categoryDir) {
  const path = join(categoryDir, '_defaults.json')
  if (!existsSync(path)) return {}
  const data = JSON.parse(readFileSync(path, 'utf-8'))
  return data.defaults?.media ?? data.media ?? {}
}

function normalizeSlug(categoryId, rawSlug) {
  const s = String(rawSlug).trim()
  if (s.startsWith(`${categoryId}-`)) return s
  return `${categoryId}-${s.replace(/^cat-|^dog-/, '')}`
}

/** 磁盘目录名：已带分类前缀则用全名，否则为历史短名（如 ill-*、tf-*） */
export function libraryMediaDir(categoryId, rawSlug) {
  const s = String(rawSlug).trim()
  if (s.startsWith(`${categoryId}-`)) return s
  return s
}

/**
 * @param {string} root
 * @param {{ category?: string|null, pack?: string|null }} [filter]
 */
export function buildItemsFromSeed(root, filter = {}) {
  const categories = filter.category
    ? [filter.category]
    : filter.pack
      ? [filter.pack]
      : listItemCategories(root)

  if (!categories.length) {
    throw new Error(
      `未找到 ${SEED_ROOT}/${ITEMS_DIR}/ 分类目录，请先执行 npm run seed:library -- split`
    )
  }

  /** @type {Map<string, { entry: object, media: { slug: string, media: object } }>} */
  const byId = new Map()
  /** @type {Map<string, string>} */
  const slugToId = new Map()

  let defaultMedia = {
    provider: 'pixabay',
    imageType: 'photo',
    orientation: 'all',
    minMatchScore: 1,
    perPage: 24
  }

  let fileCount = 0

  for (const categoryId of categories) {
    const categoryDir = join(itemsRoot(root), categoryId)
    if (!existsSync(categoryDir)) continue

    const packDefaults = { ...defaultMedia, ...loadCategoryDefaults(categoryDir) }

    for (const file of readdirSync(categoryDir)
      .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
      .sort()) {
      const path = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      const rawSlug = raw.slug ?? file.replace(/\.json$/, '')
      const slug = normalizeSlug(categoryId, rawSlug)
      const mediaDir = libraryMediaDir(categoryId, rawSlug)
      const id = ensureItemId(raw.id, slug)

      if (byId.has(id)) {
        throw new Error(`重复 id ${id}（${categoryId}/${file}）`)
      }
      if (slugToId.has(slug) && slugToId.get(slug) !== id) {
        throw new Error(`slug ${slug} 对应多个 id`)
      }
      slugToId.set(slug, id)

      const subCategoryId = raw.subCategoryId
      if (!subCategoryId) throw new Error(`[${categoryId}/${file}] 缺少 subCategoryId`)

      const base = `library/${categoryId}/${mediaDir}`
      const media = { ...packDefaults, ...(raw.media ?? {}) }

      const entry = {
        id,
        slug,
        categoryId,
        subCategoryId,
        name: raw.name,
        summary: raw.summary ?? '',
        description: formatDescription(raw.description ?? ''),
        tags: raw.tags ?? [],
        specs: raw.specs ?? {},
        coverFile: `${base}/cover.jpg`,
        galleryFiles: [
          `${base}/gallery-01.jpg`,
          `${base}/gallery-02.jpg`,
          `${base}/gallery-03.jpg`
        ],
        mediaProvider: media.provider ?? packDefaults.provider ?? 'pixabay'
      }

      byId.set(id, { entry, media: { slug, media } })
      fileCount++
    }
  }

  const catalogItems = [...byId.values()].map((v) => v.entry)
  const mediaItems = {}
  for (const { slug, media } of byId.values()) {
    const { retryQuery, urls, ...manifest } = media.media
    const entry = { ...manifest }
    if (retryQuery) entry.retryQuery = retryQuery
    if (urls?.length) entry.urls = urls
    mediaItems[slug] = entry
  }

  return {
    catalogItems,
    mediaItems,
    categoryCount: categories.length,
    fileCount,
    categories
  }
}
