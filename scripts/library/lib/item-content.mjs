import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * @param {string} categoryId
 * @param {string} mediaDir
 */
export function defaultContentFile(categoryId, mediaDir) {
  return `library/${categoryId}/${mediaDir}/content.md`
}

/**
 * 种子 JSON 只保留 contentFile 引用；长文 description 迁移到 md 文件
 * @param {object} raw
 * @param {string} categoryId
 * @param {string} mediaDir
 * @param {string} root
 */
export function normalizeSeedItemContent(raw, categoryId, mediaDir, root) {
  const contentFile = (raw.contentFile ?? defaultContentFile(categoryId, mediaDir)).replace(/\\/g, '/')
  const abs = join(root, 'assets', contentFile)
  const inline = (raw.description ?? '').trim()

  if (inline.length > 0) {
    mkdirSync(dirname(abs), { recursive: true })
    const onDisk = existsSync(abs) ? readFileSync(abs, 'utf-8').trim() : ''
    if (!onDisk || onDisk.length < inline.length * 0.6) {
      writeFileSync(abs, `${inline}\n`, 'utf-8')
    }
  }

  return { contentFile, description: null }
}

/**
 * @param {string} root
 * @param {string} contentFile
 */
export function readContentFile(root, contentFile) {
  if (!contentFile) return ''
  const abs = join(root, 'assets', contentFile.replace(/\\/g, '/'))
  if (!existsSync(abs)) return ''
  return readFileSync(abs, 'utf-8').trim()
}
