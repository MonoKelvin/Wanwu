/**
 * 批量写入全库扩充条目与分类（跳过已存在 slug）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { ensureItemId } from './stable-id.mjs'
import { EXPANSION_CATEGORIES, EXPANSION_ITEMS } from '../data/expansion-payload.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', '..', '..')

function categoriesPath() {
  return join(root, 'assets', 'seed', 'library', 'categories.json')
}

function loadCategories() {
  return JSON.parse(readFileSync(categoriesPath(), 'utf-8'))
}

function saveCategories(data) {
  writeFileSync(categoriesPath(), JSON.stringify(data, null, 2) + '\n', 'utf-8')
}

function mergeCategories(existing, incoming) {
  const byId = new Map(existing.categories.map((c) => [c.id, c]))
  let addedCats = 0
  let addedSubs = 0
  for (const cat of incoming) {
    if (!byId.has(cat.id)) {
      byId.set(cat.id, { ...cat, subcategories: [...cat.subcategories] })
      addedCats++
      continue
    }
    const cur = byId.get(cat.id)
    const subIds = new Set(cur.subcategories.map((s) => s.id))
    for (const sub of cat.subcategories) {
      if (!subIds.has(sub.id)) {
        cur.subcategories.push(sub)
        subIds.add(sub.id)
        addedSubs++
      }
    }
  }
  return { data: { ...existing, categories: [...byId.values()] }, addedCats, addedSubs }
}

function itemJson(entry) {
  const slug = entry.slug.startsWith(`${entry.categoryId}-`)
    ? entry.slug
    : `${entry.categoryId}-${entry.slug}`
  return {
    id: ensureItemId(entry.id, slug),
    slug,
    subCategoryId: entry.subCategoryId,
    name: entry.name,
    summary: entry.summary,
    description: entry.description,
    tags: entry.tags ?? [],
    specs: entry.specs ?? {},
    media: {
      provider: 'pixabay',
      query: entry.mediaQuery,
      category: entry.mediaCategory ?? 'all',
      matchTags: entry.matchTags ?? [],
      requiredTags: entry.requiredTags ?? [],
      minMatchScore: entry.minMatchScore ?? 1,
      imageCount: entry.imageCount ?? 5,
      ...entry.mediaExtra
    }
  }
}

function writeDefaults(categoryDir, categoryId) {
  const defaultsPath = join(categoryDir, '_defaults.json')
  if (existsSync(defaultsPath)) return
  const defaults = {
    media: {
      provider: 'pixabay',
      imageType: 'photo',
      orientation: 'horizontal',
      minMatchScore: 1,
      imageCount: 5
    }
  }
  if (categoryId === 'bird' || categoryId === 'insect' || categoryId === 'fish' || categoryId === 'reptile') {
    defaults.media.category = 'animals'
    defaults.media.requiredTags = [categoryId]
  }
  writeFileSync(defaultsPath, JSON.stringify(defaults, null, 2) + '\n', 'utf-8')
}

/** @param {string} rootDir */
export function applyExpansion(rootDir = root) {
  const catFile = loadCategories()
  const { data, addedCats, addedSubs } = mergeCategories(catFile, EXPANSION_CATEGORIES)
  saveCategories(data)

  const itemsRoot = join(rootDir, 'assets', 'seed', 'library', 'items')
  let written = 0
  let skipped = 0

  for (const entry of EXPANSION_ITEMS) {
    const categoryId = entry.categoryId
    const categoryDir = join(itemsRoot, categoryId)
    mkdirSync(categoryDir, { recursive: true })
    writeDefaults(categoryDir, categoryId)

    const raw = itemJson(entry)
    const filePath = join(categoryDir, `${raw.slug}.json`)
    const legacyPath = join(categoryDir, `${categoryId}-${raw.slug}.json`)
    if (existsSync(filePath) || existsSync(legacyPath)) {
      skipped++
      continue
    }
    let idCollision = false
    for (const f of readdirSync(categoryDir).filter((x) => x.endsWith('.json') && !x.startsWith('_'))) {
      try {
        const other = JSON.parse(readFileSync(join(categoryDir, f), 'utf-8'))
        if (other.id === raw.id) {
          idCollision = true
          break
        }
      } catch {
        /* ignore */
      }
    }
    if (idCollision) {
      skipped++
      continue
    }
    writeFileSync(filePath, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
    written++
  }

  console.log(`分类: 新增大类 ${addedCats}，新增子类 ${addedSubs}`)
  console.log(`条目: 新建 ${written}，跳过已存在 ${skipped}`)
  return { written, skipped }
}

import { pathToFileURL } from 'url'

const isMain =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) applyExpansion()
