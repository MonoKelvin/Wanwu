import { existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { relPath } from './media-shared.mjs'

const MIN_BYTES = 2500

/** @param {string} filePath */
export function isValidMediaFile(filePath) {
  if (!existsSync(filePath)) return false
  try {
    return statSync(filePath).size >= MIN_BYTES
  } catch {
    return false
  }
}

/**
 * 扫描目录中有效配图（至少 cover；画廊可有可无）
 * @param {string} categoryId
 * @param {string} mediaDir
 * @param {string} dirAbs
 */
export function scanValidMediaFiles(categoryId, mediaDir, dirAbs) {
  if (!existsSync(dirAbs)) return null

  const coverAbs = join(dirAbs, 'cover.jpg')
  if (!isValidMediaFile(coverAbs)) return null

  const gallery = readdirSync(dirAbs)
    .filter((f) => /^gallery-\d+\.(?:jpe?g|png|webp)$/i.test(f))
    .filter((f) => isValidMediaFile(join(dirAbs, f)))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  return {
    coverFile: relPath(categoryId, mediaDir, 'cover.jpg'),
    galleryFiles: gallery.map((f) => relPath(categoryId, mediaDir, f)),
    contentFile: relPath(categoryId, mediaDir, 'content.md')
  }
}
