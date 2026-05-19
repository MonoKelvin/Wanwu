#!/usr/bin/env node
/**
 * 生成 assets/logo/icon-{16,32,64,128,256}.png 与 public/favicon.png
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'assets', 'logo')
const publicDir = join(root, 'public')
const sizes = [16, 32, 64, 128, 256]

const INK = '#121214'
const BG = '#ffffff'

function svgForSize(size) {
  const radius = Math.round(size * 0.3125)
  const fontSize = Math.round(size * 0.4375)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${BG}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    font-family="Microsoft YaHei UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"
    font-size="${fontSize}" font-weight="700" letter-spacing="-0.04em" fill="${INK}">万</text>
</svg>`
}

function renderPngs() {
  mkdirSync(outDir, { recursive: true })
  for (const size of sizes) {
    const svgPath = join(outDir, `icon-${size}.svg`)
    const pngPath = join(outDir, `icon-${size}.png`)
    writeFileSync(svgPath, svgForSize(size), 'utf-8')
    const r = spawnSync(
      'npx',
      ['--yes', 'sharp-cli', 'resize', String(size), String(size), '-i', svgPath, '-o', pngPath],
      { cwd: root, stdio: 'inherit', shell: true }
    )
    if (r.status !== 0) {
      console.error(`生成 icon-${size}.png 失败`)
      return false
    }
  }
  mkdirSync(publicDir, { recursive: true })
  copyFileSync(join(outDir, 'icon-32.png'), join(publicDir, 'favicon.png'))
  return true
}

if (!renderPngs()) process.exit(1)
console.log(`已生成 assets/logo/icon-{${sizes.join(',')}}.png 与 public/favicon.png`)
