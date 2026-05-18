/**
 * 为 catalog.json 补充 Unsplash 摄影师归属（需 UNSPLASH_ACCESS_KEY）
 * 按 library-unsplash-curated.mjs 中实际下载的图片 ID 查询，与展示 JPG 一致。
 *
 * 用法: npm run seed:library:attribution
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { UNSPLASH_CURATED } from './library-unsplash-curated.mjs'
import { attributionsFromCuratedUrls } from './unsplash-attribution-lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')

function loadEnv() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    const val = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function main() {
  loadEnv()
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim()
  if (!accessKey) {
    console.error('需要 UNSPLASH_ACCESS_KEY（.env）才能写入摄影师归属信息')
    process.exit(1)
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))

  for (const item of catalog.items) {
    const urls = UNSPLASH_CURATED[item.slug]
    if (!urls?.length) {
      console.warn(`▸ ${item.name} — 无精选 URL，跳过`)
      continue
    }
    console.log(`▸ ${item.name}`)
    try {
      const attr = await attributionsFromCuratedUrls(accessKey, urls, sleep)
      if (!attr) {
        console.warn('  无归属数据')
        continue
      }
      item.coverAttribution = attr.coverAttribution
      item.galleryAttributions = attr.galleryAttributions
      console.log(`  ✓ ${item.coverAttribution.photographerName}`)
    } catch (e) {
      console.warn(`  ✗ ${e.message}`)
    }
    await sleep(500)
  }

  catalog.version = 4
  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
  console.log('\n已更新归属信息（catalog v4）。请完全重启应用以写入 SQLite。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
