import { existsSync, readFileSync, writeFileSync, unlinkSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'
import { isValidMediaFile } from './disk-media.mjs'

const MIN_BYTES = 2500

/** @param {string} root */
export function cleanupPlaceholders(root) {
  const lib = join(root, 'assets', 'library')
  let removedFiles = 0
  let clearedTodo = 0

  if (existsSync(lib)) {
    for (const cat of readdirSync(lib)) {
      const cp = join(lib, cat)
      if (!statSync(cp).isDirectory()) continue
      for (const slug of readdirSync(cp)) {
        const dp = join(cp, slug)
        if (!statSync(dp).isDirectory()) continue
        for (const name of readdirSync(dp)) {
          if (!/\.(jpg|jpeg|png|webp)$/i.test(name)) continue
          const p = join(dp, name)
          if (!isValidMediaFile(p)) {
            unlinkSync(p)
            removedFiles++
          }
        }
      }
    }
  }

  const idir = itemsRoot(root)
  if (existsSync(idir)) {
    for (const cat of readdirSync(idir)) {
      const cd = join(idir, cat)
      if (!statSync(cd).isDirectory() || cat.startsWith('_')) continue
      for (const file of readdirSync(cd).filter((f) => f.endsWith('.json'))) {
        const p = join(cd, file)
        const raw = JSON.parse(readFileSync(p, 'utf-8'))
        if (raw.mediaTodo) {
          delete raw.mediaTodo
          writeFileSync(p, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
          clearedTodo++
        }
      }
    }
  }

  const todoPath = join(root, 'assets', 'seed', 'library', 'MEDIA_TODO.md')
  if (existsSync(todoPath)) {
    unlinkSync(todoPath)
  }

  const seedPh = join(root, 'assets', 'seed', 'media-placeholder.png')
  if (existsSync(seedPh)) unlinkSync(seedPh)

  console.log(`已删除无效/占位图 ${removedFiles} 个，清除 mediaTodo ${clearedTodo} 条`)
}
