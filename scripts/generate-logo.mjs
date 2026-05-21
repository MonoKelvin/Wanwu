#!/usr/bin/env node
/**
 * 生成 assets/logo/icon-{size}.png（白底黑字）与 icon-{size}-dark.png（黑底白字）
 * 仅输出 PNG；SVG 仅作临时文件。同步 public/favicon.png / favicon-dark.png
 */
import { mkdirSync, writeFileSync, copyFileSync, mkdtempSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'assets', 'logo')
const publicDir = join(root, 'public')
const sizes = [16, 32, 64, 128, 256]

const variants = {
  light: { bg: '#ffffff', ink: '#121214', suffix: '' },
  dark: { bg: '#121214', ink: '#f4f4f5', suffix: '-dark' }
}

function svgForSize(size, { bg, ink }) {
  const radius = Math.round(size * 0.3125)
  const fontSize = Math.round(size * 0.4375)
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
    font-family="Microsoft YaHei UI, Microsoft YaHei, PingFang SC, Noto Sans SC, sans-serif"
    font-size="${fontSize}" font-weight="700" letter-spacing="-0.04em" fill="${ink}">万</text>
</svg>`
}

function renderPngs() {
  mkdirSync(outDir, { recursive: true })
  mkdirSync(publicDir, { recursive: true })
  const tmp = mkdtempSync(join(tmpdir(), 'wanwu-logo-'))

  try {
    for (const [key, { bg, ink, suffix }] of Object.entries(variants)) {
      for (const size of sizes) {
        const svgPath = join(tmp, `icon-${size}-${key}.svg`)
        const pngPath = join(outDir, `icon-${size}${suffix}.png`)
        writeFileSync(svgPath, svgForSize(size, { bg, ink }), 'utf-8')
        const r = spawnSync(
          'npx',
          ['--yes', 'sharp-cli', 'resize', String(size), String(size), '-i', svgPath, '-o', pngPath],
          { cwd: root, stdio: 'inherit', shell: true }
        )
        if (r.status !== 0) {
          console.error(`生成 icon-${size}${suffix}.png 失败`)
          return false
        }
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  copyFileSync(join(outDir, 'icon-32.png'), join(publicDir, 'favicon.png'))
  copyFileSync(join(outDir, 'icon-32-dark.png'), join(publicDir, 'favicon-dark.png'))
  return true
}

if (!renderPngs()) process.exit(1)
console.log(
  `已生成 assets/logo/icon-{${sizes.join(',')}}.png、icon-{${sizes.join(',')}}-dark.png 与 public/favicon*.png`
)
