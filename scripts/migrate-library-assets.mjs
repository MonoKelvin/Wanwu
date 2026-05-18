/**
 * 将旧目录配图迁移到新 slug / categoryId 路径
 * node scripts/migrate-library-assets.mjs
 */
import { existsSync, mkdirSync, cpSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lib = join(root, 'assets', 'library')

const moves = [
  ['superhero-anime/superhero-spiderman', 'superhero/hero-spiderman'],
  ['superhero-anime/superhero-batman-tas', 'superhero/hero-batman-dc']
]

for (const [from, to] of moves) {
  const src = join(lib, from)
  const dest = join(lib, to)
  if (!existsSync(src)) {
    console.log(`跳过（无源）: ${from}`)
    continue
  }
  mkdirSync(dirname(dest), { recursive: true })
  cpSync(src, dest, { recursive: true })
  console.log(`已迁移: ${from} → ${to}`)
}
