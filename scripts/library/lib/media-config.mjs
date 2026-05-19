/**
 * 全库配图通用配置：assets/seed/library/media.json
 * 支持 pixabay | unsplash | manual，便于后续扩展 MCP / 其它源
 */
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const mediaPath = join(root, 'assets', 'seed', 'library', 'media.json')

/** @typedef {'pixabay'|'unsplash'|'manual'} MediaProviderId */

/**
 * @typedef {object} ResolvedMediaConfig
 * @property {MediaProviderId} provider
 * @property {string} query
 * @property {string} [category]
 * @property {string[]} matchTags
 * @property {number} minMatchScore
 * @property {string} imageType
 * @property {string} orientation
 * @property {number} perPage
 * @property {number} imageCount
 * @property {boolean} manualOnly
 */

let _cache = null

export function clearMediaManifestCache() {
  _cache = null
}

export function loadMediaManifest() {
  if (_cache) return _cache
  if (!existsSync(mediaPath)) {
    throw new Error(`未找到 ${mediaPath}`)
  }
  _cache = JSON.parse(readFileSync(mediaPath, 'utf-8'))
  return _cache
}

export function listConfiguredSlugs() {
  return Object.keys(loadMediaManifest().items ?? {})
}

/**
 * @param {string} slug
 * @param {{ slug?: string, name?: string, tags?: string[] }} [catalogItem]
 * @returns {ResolvedMediaConfig}
 */
export function resolveMediaConfig(slug, catalogItem = {}) {
  const manifest = loadMediaManifest()
  const defaults = manifest.defaults ?? {}
  const entry = manifest.items?.[slug] ?? {}

  const provider = /** @type {MediaProviderId} */ (
    entry.provider ?? defaults.provider ?? 'pixabay'
  )

  const query =
    entry.query ??
    fallbackQueryFromSlug(slug, catalogItem)

  const categoryId = slug.split('-')[0]
  const petCategory = ['cat', 'dog'].includes(categoryId)
    ? categoryId
    : ['cat', 'dog'].includes(catalogItem.categoryId)
      ? catalogItem.categoryId
      : null

  return {
    provider,
    query,
    category: entry.category ?? (petCategory ? 'animals' : undefined),
    matchTags:
      entry.matchTags ??
      (petCategory ? [petCategory, ...slug.replace(new RegExp(`^${petCategory}-`), '').split('-').slice(0, 2)] : []),
    requiredTags: entry.requiredTags ?? (petCategory ? [petCategory] : []),
    minMatchScore: entry.minMatchScore ?? defaults.minMatchScore ?? 1,
    imageType: entry.imageType ?? defaults.imageType ?? 'photo',
    orientation: entry.orientation ?? defaults.orientation ?? 'all',
    perPage: entry.perPage ?? defaults.perPage ?? 40,
    imageCount: Math.min(
      12,
      Math.max(1, entry.imageCount ?? defaults.imageCount ?? 4)
    ),
    manualOnly: provider === 'manual'
  }
}

function fallbackQueryFromSlug(slug, catalogItem) {
  const name = catalogItem.name?.trim() ?? ''
  const tail = slug.replace(/^[^-]+-/, '').replace(/-/g, ' ')
  const tag = catalogItem.tags?.[0] ?? ''
  return name || `${tail} ${tag}`.trim()
}

export function providerEnvKey(providerId) {
  const manifest = loadMediaManifest()
  return manifest.providers?.[providerId]?.envKey ?? null
}
